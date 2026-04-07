export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          action_type: string
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          metadata: Json | null
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          action_type: string
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
          user_name: string
        }
        Update: {
          action?: string
          action_type?: string
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      app_releases: {
        Row: {
          created_at: string
          created_by: string
          download_url: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_active: boolean
          platform: string
          release_notes: string | null
          storage_name: string | null
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by: string
          download_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean
          platform?: string
          release_notes?: string | null
          storage_name?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string
          download_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean
          platform?: string
          release_notes?: string | null
          storage_name?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      appeal_attachments: {
        Row: {
          appeal_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          storage_name: string
        }
        Insert: {
          appeal_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          storage_name: string
        }
        Update: {
          appeal_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          storage_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeal_attachments_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "score_appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      background_music_folders: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      background_music_tracks: {
        Row: {
          artist: string | null
          created_at: string
          created_by: string
          display_order: number
          duration_seconds: number | null
          file_path: string | null
          folder_id: string | null
          id: string
          is_default: boolean
          source_type: string
          source_url: string | null
          storage_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist?: string | null
          created_at?: string
          created_by: string
          display_order?: number
          duration_seconds?: number | null
          file_path?: string | null
          folder_id?: string | null
          id?: string
          is_default?: boolean
          source_type?: string
          source_url?: string | null
          storage_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist?: string | null
          created_at?: string
          created_by?: string
          display_order?: number
          duration_seconds?: number | null
          file_path?: string | null
          folder_id?: string | null
          id?: string
          is_default?: boolean
          source_type?: string
          source_url?: string | null
          storage_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_music_tracks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "background_music_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_passwords: {
        Row: {
          id: string
          plain_password: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          plain_password: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          plain_password?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          digest_data: Json | null
          email_type: string
          id: string
          recipient_email: string
          sent_at: string
          tasks_count: number
          user_id: string
        }
        Insert: {
          digest_data?: Json | null
          email_type?: string
          id?: string
          recipient_email: string
          sent_at?: string
          tasks_count?: number
          user_id: string
        }
        Update: {
          digest_data?: Json | null
          email_type?: string
          id?: string
          recipient_email?: string
          sent_at?: string
          tasks_count?: number
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      feedback_comments: {
        Row: {
          content: string
          created_at: string
          feedback_id: string
          id: string
          is_admin: boolean
          is_hidden: boolean | null
          reply_to_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          feedback_id: string
          id?: string
          is_admin?: boolean
          is_hidden?: boolean | null
          reply_to_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          feedback_id?: string
          id?: string
          is_admin?: boolean
          is_hidden?: boolean | null
          reply_to_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_comments_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedbacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_comments_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "feedback_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reactions: {
        Row: {
          created_at: string
          feedback_id: string
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          id?: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_reactions_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedbacks"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          admin_response: string | null
          content: string
          created_at: string
          group_id: string | null
          id: string
          is_hidden: boolean | null
          priority: string
          responded_at: string | null
          responded_by: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          content: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_hidden?: boolean | null
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_hidden?: boolean | null
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          is_guest: boolean
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_guest?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_guest?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          activity_logging_enabled: boolean | null
          additional_info: string | null
          allow_join_by_code: boolean | null
          appeal_deadline_hours: number | null
          class_code: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          instructor_email: string | null
          instructor_name: string | null
          is_public: boolean | null
          join_code: string | null
          join_member_limit: number | null
          join_require_approval: boolean
          leader_id: string | null
          name: string
          score_finalized_at: string | null
          share_token: string | null
          short_id: string | null
          show_activity_public: boolean | null
          show_members_public: boolean | null
          show_resources_public: boolean | null
          show_scores_public: boolean | null
          show_tasks_public: boolean | null
          slug: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["project_visibility"]
          workspace_id: string | null
          zalo_link: string | null
        }
        Insert: {
          activity_logging_enabled?: boolean | null
          additional_info?: string | null
          allow_join_by_code?: boolean | null
          appeal_deadline_hours?: number | null
          class_code?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructor_email?: string | null
          instructor_name?: string | null
          is_public?: boolean | null
          join_code?: string | null
          join_member_limit?: number | null
          join_require_approval?: boolean
          leader_id?: string | null
          name: string
          score_finalized_at?: string | null
          share_token?: string | null
          short_id?: string | null
          show_activity_public?: boolean | null
          show_members_public?: boolean | null
          show_resources_public?: boolean | null
          show_scores_public?: boolean | null
          show_tasks_public?: boolean | null
          slug?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["project_visibility"]
          workspace_id?: string | null
          zalo_link?: string | null
        }
        Update: {
          activity_logging_enabled?: boolean | null
          additional_info?: string | null
          allow_join_by_code?: boolean | null
          appeal_deadline_hours?: number | null
          class_code?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructor_email?: string | null
          instructor_name?: string | null
          is_public?: boolean | null
          join_code?: string | null
          join_member_limit?: number | null
          join_require_approval?: boolean
          leader_id?: string | null
          name?: string
          score_finalized_at?: string | null
          share_token?: string | null
          short_id?: string | null
          show_activity_public?: boolean | null
          show_members_public?: boolean | null
          show_resources_public?: boolean | null
          show_scores_public?: boolean | null
          show_tasks_public?: boolean | null
          slug?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["project_visibility"]
          workspace_id?: string | null
          zalo_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_projects: {
        Row: {
          group_id: string
          hidden_at: string
          id: string
          user_id: string
        }
        Insert: {
          group_id: string
          hidden_at?: string
          id?: string
          user_id: string
        }
        Update: {
          group_id?: string
          hidden_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_projects_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendance: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          marked_by: string | null
          meeting_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          marked_by?: string | null
          meeting_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          marked_by?: string | null
          meeting_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          meeting_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          meeting_id: string
          user_id: string
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          meeting_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_messages_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          external_link: string | null
          group_id: string
          id: string
          jitsi_room_name: string
          notes: string | null
          scheduled_at: string
          status: string
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          external_link?: string | null
          group_id: string
          id?: string
          jitsi_room_name: string
          notes?: string | null
          scheduled_at: string
          status?: string
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          external_link?: string | null
          group_id?: string
          id?: string
          jitsi_room_name?: string
          notes?: string | null
          scheduled_at?: string
          status?: string
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      member_final_scores: {
        Row: {
          adjustment: number | null
          created_at: string
          final_score: number | null
          group_id: string
          id: string
          updated_at: string
          user_id: string
          weighted_average: number | null
        }
        Insert: {
          adjustment?: number | null
          created_at?: string
          final_score?: number | null
          group_id: string
          id?: string
          updated_at?: string
          user_id: string
          weighted_average?: number | null
        }
        Update: {
          adjustment?: number | null
          created_at?: string
          final_score?: number | null
          group_id?: string
          id?: string
          updated_at?: string
          user_id?: string
          weighted_average?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "member_final_scores_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      member_stage_scores: {
        Row: {
          adjusted_score: number | null
          average_score: number | null
          bug_hunter_bonus: boolean
          created_at: string
          early_submission_bonus: boolean
          final_stage_score: number | null
          id: string
          k_coefficient: number | null
          late_task_count: number
          stage_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adjusted_score?: number | null
          average_score?: number | null
          bug_hunter_bonus?: boolean
          created_at?: string
          early_submission_bonus?: boolean
          final_stage_score?: number | null
          id?: string
          k_coefficient?: number | null
          late_task_count?: number
          stage_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adjusted_score?: number | null
          average_score?: number | null
          bug_hunter_bonus?: boolean
          created_at?: string
          early_submission_bonus?: boolean
          final_stage_score?: number | null
          id?: string
          k_coefficient?: number | null
          late_task_count?: number
          stage_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_stage_scores_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_mentions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          mentioned_by: string
          mentioned_user_id: string
          message_id: string
          message_type: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          mentioned_by: string
          mentioned_user_id: string
          message_id: string
          message_type: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          mentioned_by?: string
          mentioned_user_id?: string
          message_id?: string
          message_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dismissals: {
        Row: {
          dismissed_at: string
          id: string
          notification_id: string
          session_id: string | null
          user_id: string | null
          view_count: number
        }
        Insert: {
          dismissed_at?: string
          id?: string
          notification_id: string
          session_id?: string | null
          user_id?: string | null
          view_count?: number
        }
        Update: {
          dismissed_at?: string
          id?: string
          notification_id?: string
          session_id?: string | null
          user_id?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_dismissals_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "system_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          is_read: boolean
          message: string
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean
          message: string
          task_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      pending_approvals: {
        Row: {
          created_at: string
          group_id: string
          id: string
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_approvals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_events: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          id: string
          start_time: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          start_time: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_achievements: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_path: string | null
          link_url: string | null
          storage_name: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_path?: string | null
          link_url?: string | null
          storage_name?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_path?: string | null
          link_url?: string | null
          storage_name?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_status: string | null
          email: string
          email_notifications: boolean
          full_name: string
          id: string
          institution: string | null
          is_approved: boolean
          major: string | null
          must_change_password: boolean
          nav_hidden_pages: Json
          onboarding_completed: boolean
          phone: string | null
          project_limit: number | null
          skills: string | null
          social_links: Json
          status_updated_at: string | null
          storage_limit_mb: number | null
          student_id: string
          suspended_at: string | null
          suspended_by: string | null
          suspended_until: string | null
          suspension_reason: string | null
          updated_at: string
          username: string | null
          year_batch: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_status?: string | null
          email: string
          email_notifications?: boolean
          full_name: string
          id: string
          institution?: string | null
          is_approved?: boolean
          major?: string | null
          must_change_password?: boolean
          nav_hidden_pages?: Json
          onboarding_completed?: boolean
          phone?: string | null
          project_limit?: number | null
          skills?: string | null
          social_links?: Json
          status_updated_at?: string | null
          storage_limit_mb?: number | null
          student_id: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string
          username?: string | null
          year_batch?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_status?: string | null
          email?: string
          email_notifications?: boolean
          full_name?: string
          id?: string
          institution?: string | null
          is_approved?: boolean
          major?: string | null
          must_change_password?: boolean
          nav_hidden_pages?: Json
          onboarding_completed?: boolean
          phone?: string | null
          project_limit?: number | null
          skills?: string | null
          social_links?: Json
          status_updated_at?: string | null
          storage_limit_mb?: number | null
          student_id?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string
          username?: string | null
          year_batch?: string | null
        }
        Relationships: []
      }
      project_invitations: {
        Row: {
          created_at: string
          expires_at: string | null
          group_id: string
          id: string
          invited_by: string
          invited_user_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          group_id: string
          id?: string
          invited_by: string
          invited_user_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          reply_to: string | null
          source_task_id: string | null
          source_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          reply_to?: string | null
          source_task_id?: string | null
          source_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          reply_to?: string | null
          source_task_id?: string | null
          source_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "project_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_source_task_id_fkey"
            columns: ["source_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_resources: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          file_path: string | null
          file_size: number
          file_type: string | null
          folder_id: string | null
          group_id: string
          id: string
          link_url: string | null
          name: string
          resource_type: string
          storage_name: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_path?: string | null
          file_size?: number
          file_type?: string | null
          folder_id?: string | null
          group_id: string
          id?: string
          link_url?: string | null
          name: string
          resource_type?: string
          storage_name?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_path?: string | null
          file_size?: number
          file_type?: string | null
          folder_id?: string | null
          group_id?: string
          id?: string
          link_url?: string | null
          name?: string
          resource_type?: string
          storage_name?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_resources_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "resource_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resources_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_folders: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          group_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_folders_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      score_adjustment_history: {
        Row: {
          adjusted_by: string
          adjustment_type: string
          adjustment_value: number | null
          created_at: string
          id: string
          new_score: number | null
          previous_score: number | null
          reason: string | null
          target_id: string
          user_id: string
        }
        Insert: {
          adjusted_by: string
          adjustment_type: string
          adjustment_value?: number | null
          created_at?: string
          id?: string
          new_score?: number | null
          previous_score?: number | null
          reason?: string | null
          target_id: string
          user_id: string
        }
        Update: {
          adjusted_by?: string
          adjustment_type?: string
          adjustment_value?: number | null
          created_at?: string
          id?: string
          new_score?: number | null
          previous_score?: number | null
          reason?: string | null
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      score_appeals: {
        Row: {
          created_at: string
          final_score_id: string | null
          id: string
          reason: string
          reviewer_id: string | null
          reviewer_response: string | null
          stage_score_id: string | null
          status: string
          task_score_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          final_score_id?: string | null
          id?: string
          reason: string
          reviewer_id?: string | null
          reviewer_response?: string | null
          stage_score_id?: string | null
          status?: string
          task_score_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          final_score_id?: string | null
          id?: string
          reason?: string
          reviewer_id?: string | null
          reviewer_response?: string | null
          stage_score_id?: string | null
          status?: string
          task_score_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_appeals_final_score_id_fkey"
            columns: ["final_score_id"]
            isOneToOne: false
            referencedRelation: "member_final_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_appeals_stage_score_id_fkey"
            columns: ["stage_score_id"]
            isOneToOne: false
            referencedRelation: "member_stage_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_appeals_task_score_id_fkey"
            columns: ["task_score_id"]
            isOneToOne: false
            referencedRelation: "task_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_weights: {
        Row: {
          created_at: string
          group_id: string
          id: string
          stage_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          stage_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          stage_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "stage_weights_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_weights_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          group_id: string
          id: string
          is_hidden: boolean | null
          name: string
          order_index: number
          start_date: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          group_id: string
          id?: string
          is_hidden?: boolean | null
          name: string
          order_index?: number
          start_date?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          group_id?: string
          id?: string
          is_hidden?: boolean | null
          name?: string
          order_index?: number
          start_date?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_history: {
        Row: {
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          note: string | null
          submission_link: string
          submission_type: string | null
          submitted_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          note?: string | null
          submission_link: string
          submission_type?: string | null
          submitted_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          note?: string | null
          submission_link?: string
          submission_type?: string | null
          submitted_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_error_logs: {
        Row: {
          component: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          last_occurred_at: string
          metadata: Json | null
          occurrence_count: number
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          error_type?: string
          id?: string
          last_occurred_at?: string
          metadata?: Json | null
          occurrence_count?: number
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          last_occurred_at?: string
          metadata?: Json | null
          occurrence_count?: number
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_notifications: {
        Row: {
          content: string
          created_at: string
          created_by: string
          display_mode: string
          expires_at: string | null
          id: string
          is_active: boolean
          min_view_seconds: number
          target_user_ids: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          display_mode?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_view_seconds?: number
          target_user_ids?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          display_mode?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_view_seconds?: number
          target_user_ids?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          assigned_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_note_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          note_id: string
          storage_name: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          note_id: string
          storage_name: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          note_id?: string
          storage_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "task_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notes: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          task_id: string
          updated_at: string
          version_name: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          task_id: string
          updated_at?: string
          version_name: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          task_id?: string
          updated_at?: string
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_scores: {
        Row: {
          adjusted_at: string | null
          adjusted_by: string | null
          adjustment: number | null
          adjustment_reason: string | null
          base_score: number
          bug_hunter_bonus: boolean
          created_at: string
          early_bonus: boolean
          final_score: number | null
          id: string
          late_penalty: number
          review_count: number
          review_penalty: number
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adjusted_at?: string | null
          adjusted_by?: string | null
          adjustment?: number | null
          adjustment_reason?: string | null
          base_score?: number
          bug_hunter_bonus?: boolean
          created_at?: string
          early_bonus?: boolean
          final_score?: number | null
          id?: string
          late_penalty?: number
          review_count?: number
          review_penalty?: number
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adjusted_at?: string | null
          adjusted_by?: string | null
          adjustment?: number | null
          adjustment_reason?: string | null
          base_score?: number
          bug_hunter_bonus?: boolean
          created_at?: string
          early_bonus?: boolean
          final_score?: number | null
          id?: string
          late_penalty?: number
          review_count?: number
          review_penalty?: number
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_scores_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          extended_deadline: string | null
          group_id: string
          id: string
          is_hidden: boolean | null
          max_file_size: number | null
          short_id: string | null
          slug: string | null
          stage_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          submission_link: string | null
          submission_method: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          extended_deadline?: string | null
          group_id: string
          id?: string
          is_hidden?: boolean | null
          max_file_size?: number | null
          short_id?: string | null
          slug?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          submission_link?: string | null
          submission_method?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          extended_deadline?: string | null
          group_id?: string
          id?: string
          is_hidden?: boolean | null
          max_file_size?: number | null
          short_id?: string | null
          slug?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          submission_link?: string | null
          submission_method?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_sessions: {
        Row: {
          id: string
          last_seen_at: string
          started_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_seen_at?: string
          started_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_seen_at?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_login_logs: {
        Row: {
          id: string
          logged_in_at: string
          user_id: string
        }
        Insert: {
          id?: string
          logged_in_at?: string
          user_id: string
        }
        Update: {
          id?: string
          logged_in_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_music_links: {
        Row: {
          created_at: string
          display_order: number
          id: string
          title: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_music_progress: {
        Row: {
          duration_seconds: number | null
          id: string
          position_seconds: number
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          position_seconds?: number
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          position_seconds?: number
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_music_settings: {
        Row: {
          created_at: string
          id: string
          master_enabled: boolean
          personal_music_enabled: boolean
          preferred_folder_id: string | null
          system_music_enabled: boolean
          updated_at: string
          user_id: string
          volume: number
        }
        Insert: {
          created_at?: string
          id?: string
          master_enabled?: boolean
          personal_music_enabled?: boolean
          preferred_folder_id?: string | null
          system_music_enabled?: boolean
          updated_at?: string
          user_id: string
          volume?: number
        }
        Update: {
          created_at?: string
          id?: string
          master_enabled?: boolean
          personal_music_enabled?: boolean
          preferred_folder_id?: string | null
          system_music_enabled?: boolean
          updated_at?: string
          user_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_music_settings_preferred_folder_id_fkey"
            columns: ["preferred_folder_id"]
            isOneToOne: false
            referencedRelation: "background_music_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          id: string
          last_login_date: string | null
          longest_streak: number
          recovery_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_login_date?: string | null
          longest_streak?: number
          recovery_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_login_date?: string | null
          longest_streak?: number
          recovery_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_invites: {
        Row: {
          created_at: string
          expires_at: string
          group_id: string | null
          id: string
          invited_by: string
          invitee_email: string
          invitee_user_id: string | null
          is_guest: boolean
          role_granted: string
          scope: Database["public"]["Enums"]["invite_scope"]
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          group_id?: string | null
          id?: string
          invited_by: string
          invitee_email: string
          invitee_user_id?: string | null
          is_guest?: boolean
          role_granted: string
          scope: Database["public"]["Enums"]["invite_scope"]
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          group_id?: string | null
          id?: string
          invited_by?: string
          invitee_email?: string
          invitee_user_id?: string | null
          is_guest?: boolean
          role_granted?: string
          scope?: Database["public"]["Enums"]["invite_scope"]
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          max_members: number
          max_projects: number
          max_storage_mb: number
          name: string
          owner_id: string
          plan: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          max_members?: number
          max_projects?: number
          max_storage_mb?: number
          name: string
          owner_id: string
          plan?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          max_members?: number
          max_projects?: number
          max_storage_mb?: number
          name?: string
          owner_id?: string
          plan?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_project_access: {
        Args: { _group_id: string; _user_id: string }
        Returns: {
          group_id: string
          group_role: Database["public"]["Enums"]["app_role"]
          is_project_guest: boolean
          visibility: Database["public"]["Enums"]["project_visibility"]
          workspace_id: string
          ws_owner_id: string
          ws_role: string
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_vietnamese_slug: {
        Args: { input_text: string }
        Returns: string
      }
      generate_workspace_slug: { Args: { _name: string }; Returns: string }
      get_email_by_student_id: {
        Args: { _student_id: string }
        Returns: string
      }
      get_group_member_count_for_join: {
        Args: { _group_id: string }
        Returns: {
          join_member_limit: number
          member_count: number
        }[]
      }
      get_workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_group_leader: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_leader: { Args: { _user_id: string }; Returns: boolean }
      is_moderator: { Args: { _user_id: string }; Returns: boolean }
      is_task_assignee: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_participant: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "leader" | "member"
      approval_status: "pending" | "approved" | "rejected"
      invite_scope: "workspace" | "project"
      project_visibility: "private" | "workspace_public" | "public_link"
      task_status: "TODO" | "IN_PROGRESS" | "DONE" | "VERIFIED"
      workspace_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "leader", "member"],
      approval_status: ["pending", "approved", "rejected"],
      invite_scope: ["workspace", "project"],
      project_visibility: ["private", "workspace_public", "public_link"],
      task_status: ["TODO", "IN_PROGRESS", "DONE", "VERIFIED"],
      workspace_role: ["admin", "member"],
    },
  },
} as const
