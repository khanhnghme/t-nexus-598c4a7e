import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ALLOWED_BUCKETS = [
  'avatars', 'task-submissions', 'appeal-attachments', 'task-note-attachments',
  'group-images', 'project-resources', 'system-assets', 'profile-achievements',
]

const BUCKET_URL_KEYS: Record<string, string> = {
  'avatars': 'R2_URL_AVATARS',
  'task-submissions': 'R2_URL_TASK_SUBMISSIONS',
  'appeal-attachments': 'R2_URL_APPEAL_ATTACHMENTS',
  'task-note-attachments': 'R2_URL_TASK_NOTE_ATTACHMENTS',
  'group-images': 'R2_URL_GROUP_IMAGES',
  'project-resources': 'R2_URL_PROJECT_RESOURCES',
  'system-assets': 'R2_URL_SYSTEM_ASSETS',
  'profile-achievements': 'R2_URL_PROFILE_ACHIEVEMENTS',
}

function getR2Config() {
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')!
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')!
  let endpoint = Deno.env.get('R2_ENDPOINT')!
  
  // Clean endpoint: remove trailing slashes and any bucket-name path suffix
  // R2_ENDPOINT must be: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  endpoint = endpoint.replace(/\/+$/, '')
  
  // If endpoint contains a path after the host (e.g. /old-bucket-name), strip it
  try {
    const parsed = new URL(endpoint)
    if (parsed.pathname && parsed.pathname !== '/') {
      console.warn(`R2_ENDPOINT has path suffix "${parsed.pathname}", stripping it`)
      endpoint = `${parsed.protocol}//${parsed.host}`
    }
  } catch {
    // Not a valid URL, use as-is
  }
  
  return { accessKeyId, secretAccessKey, endpoint }
}

function getBucketPublicUrl(bucket: string): string {
  const key = BUCKET_URL_KEYS[bucket]
  if (!key) return ''
  const url = Deno.env.get(key) || ''
  return url.replace(/\/+$/, '')
}

async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // bucket-urls action doesn't need auth (returns public URL map)
    if (req.method === 'GET' && action === 'bucket-urls') {
      const urls: Record<string, string> = {}
      for (const b of ALLOWED_BUCKETS) {
        urls[b] = getBucketPublicUrl(b)
      }
      return new Response(JSON.stringify(urls), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = await authenticateUser(req)
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const config = getR2Config()
    const r2 = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    })

    const bucket = url.searchParams.get('bucket') || ''
    
    if (bucket && !ALLOWED_BUCKETS.includes(bucket)) {
      return new Response(JSON.stringify({ error: `Invalid bucket: ${bucket}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST' && action === 'upload') {
      const path = url.searchParams.get('path') || ''
      if (!bucket || !path) {
        return new Response(JSON.stringify({ error: 'Missing bucket or path' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const contentType = req.headers.get('content-type') || 'application/octet-stream'
      const body = await req.arrayBuffer()

      // bucket IS the R2 bucket name, path is the object key
      const r2Url = `${config.endpoint}/${bucket}/${path}`
      console.log(`R2 upload: endpoint=${config.endpoint}, bucket=${bucket}, r2Url=${r2Url}`)
      const response = await r2.fetch(r2Url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body,
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('R2 upload error:', errText)
        return new Response(JSON.stringify({ error: 'Upload failed', details: errText }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      await response.text()

      const bucketPublicUrl = getBucketPublicUrl(bucket)
      const publicUrl = bucketPublicUrl ? `${bucketPublicUrl}/${path}` : ''
      
      return new Response(JSON.stringify({ 
        data: { path, fullPath: `${bucket}/${path}`, publicUrl },
        error: null 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST' && action === 'delete') {
      const { bucket: delBucket, paths } = await req.json()
      const targetBucket = delBucket || bucket
      
      if (!targetBucket || !paths?.length) {
        return new Response(JSON.stringify({ error: 'Missing bucket or paths' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!ALLOWED_BUCKETS.includes(targetBucket)) {
        return new Response(JSON.stringify({ error: `Invalid bucket: ${targetBucket}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const errors: string[] = []
      for (const p of paths) {
        const r2Url = `${config.endpoint}/${targetBucket}/${p}`
        const response = await r2.fetch(r2Url, { method: 'DELETE' })
        if (!response.ok) errors.push(`Failed to delete ${p}`)
        await response.text()
      }

      return new Response(JSON.stringify({ 
        data: { deleted: paths.length - errors.length },
        errors: errors.length ? errors : null 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET' && action === 'url') {
      const path = url.searchParams.get('path') || ''
      const bucketPublicUrl = getBucketPublicUrl(bucket)
      const publicUrl = bucketPublicUrl ? `${bucketPublicUrl}/${path}` : ''
      
      return new Response(JSON.stringify({ publicUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET' && action === 'list') {
      const prefix = url.searchParams.get('prefix') || ''

      const listUrl = new URL(`${config.endpoint}/${bucket}`)
      listUrl.searchParams.set('list-type', '2')
      if (prefix) listUrl.searchParams.set('prefix', prefix)
      
      const response = await r2.fetch(listUrl, { method: 'GET' })
      const respText = await response.text()

      if (!response.ok) {
        return new Response(JSON.stringify({ error: 'List failed', details: respText }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const xml = respText
      const files: { name: string; id: string; created_at: string; metadata: { size: number; mimetype: string } }[] = []
      const keyRegex = /<Key>([^<]+)<\/Key>/g
      const sizeRegex = /<Size>([^<]+)<\/Size>/g
      const lastModRegex = /<LastModified>([^<]+)<\/LastModified>/g

      let keyMatch, sizeMatch, lastModMatch
      while ((keyMatch = keyRegex.exec(xml)) !== null) {
        sizeMatch = sizeRegex.exec(xml)
        lastModMatch = lastModRegex.exec(xml)
        const fullKey = keyMatch[1]
        const relativeName = prefix ? fullKey.replace(prefix, '') : fullKey
        if (!relativeName) continue
        files.push({
          name: relativeName,
          id: fullKey,
          created_at: lastModMatch ? lastModMatch[1] : '',
          metadata: {
            size: sizeMatch ? parseInt(sizeMatch[1]) : 0,
            mimetype: 'application/octet-stream',
          },
        })
      }

      return new Response(JSON.stringify(files), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET' && action === 'download') {
      const path = url.searchParams.get('path') || ''
      const r2Url = `${config.endpoint}/${bucket}/${path}`
      const response = await r2.fetch(r2Url, { method: 'GET' })
      
      if (!response.ok) {
        await response.text()
        return new Response(JSON.stringify({ error: 'File not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const blob = await response.blob()
      return new Response(blob, {
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('R2 storage error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
