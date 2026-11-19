
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "auth": {
          Tables: {
            "audit_log_entries": {
                  Row: {
                    "created_at": string | null,"id": string,"instance_id": string | null,"ip_address": string,"payload": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id": string,"instance_id"?: string | null,"ip_address"?: string,"payload"?: Json | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"instance_id"?: string | null,"ip_address"?: string,"payload"?: Json | null
                  }
                  Relationships: [
                    
                  ]
                },"custom_oauth_providers": {
                  Row: {
                    "acceptable_client_ids": (string)[],"attribute_mapping": NonNullable<Json>,"authorization_params": NonNullable<Json>,"authorization_url": string | null,"cached_discovery": Json | null,"client_id": string,"client_secret": string,"created_at": string,"custom_claims_allowlist": (string)[],"discovery_cached_at": string | null,"discovery_url": string | null,"email_optional": boolean,"enabled": boolean,"id": string,"identifier": string,"issuer": string | null,"jwks_uri": string | null,"name": string,"pkce_enabled": boolean,"provider_type": string,"scopes": (string)[],"skip_nonce_check": boolean,"token_url": string | null,"updated_at": string,"userinfo_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acceptable_client_ids"?: (string)[],"attribute_mapping"?: NonNullable<Json>,"authorization_params"?: NonNullable<Json>,"authorization_url"?: string | null,"cached_discovery"?: Json | null,"client_id": string,"client_secret": string,"created_at"?: string,"custom_claims_allowlist"?: (string)[],"discovery_cached_at"?: string | null,"discovery_url"?: string | null,"email_optional"?: boolean,"enabled"?: boolean,"id"?: string,"identifier": string,"issuer"?: string | null,"jwks_uri"?: string | null,"name": string,"pkce_enabled"?: boolean,"provider_type": string,"scopes"?: (string)[],"skip_nonce_check"?: boolean,"token_url"?: string | null,"updated_at"?: string,"userinfo_url"?: string | null
                  }
                  Update: {
                    "acceptable_client_ids"?: (string)[],"attribute_mapping"?: NonNullable<Json>,"authorization_params"?: NonNullable<Json>,"authorization_url"?: string | null,"cached_discovery"?: Json | null,"client_id"?: string,"client_secret"?: string,"created_at"?: string,"custom_claims_allowlist"?: (string)[],"discovery_cached_at"?: string | null,"discovery_url"?: string | null,"email_optional"?: boolean,"enabled"?: boolean,"id"?: string,"identifier"?: string,"issuer"?: string | null,"jwks_uri"?: string | null,"name"?: string,"pkce_enabled"?: boolean,"provider_type"?: string,"scopes"?: (string)[],"skip_nonce_check"?: boolean,"token_url"?: string | null,"updated_at"?: string,"userinfo_url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"flow_state": {
                  Row: {
                    "auth_code": string | null,"auth_code_issued_at": string | null,"authentication_method": string,"code_challenge": string | null,"code_challenge_method": Database["auth"]['Enums']["code_challenge_method"] | null,"created_at": string | null,"email_optional": boolean,"id": string,"invite_token": string | null,"linking_target_id": string | null,"oauth_client_state_id": string | null,"provider_access_token": string | null,"provider_refresh_token": string | null,"provider_type": string,"referrer": string | null,"updated_at": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_code"?: string | null,"auth_code_issued_at"?: string | null,"authentication_method": string,"code_challenge"?: string | null,"code_challenge_method"?: Database["auth"]['Enums']["code_challenge_method"] | null,"created_at"?: string | null,"email_optional"?: boolean,"id": string,"invite_token"?: string | null,"linking_target_id"?: string | null,"oauth_client_state_id"?: string | null,"provider_access_token"?: string | null,"provider_refresh_token"?: string | null,"provider_type": string,"referrer"?: string | null,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "auth_code"?: string | null,"auth_code_issued_at"?: string | null,"authentication_method"?: string,"code_challenge"?: string | null,"code_challenge_method"?: Database["auth"]['Enums']["code_challenge_method"] | null,"created_at"?: string | null,"email_optional"?: boolean,"id"?: string,"invite_token"?: string | null,"linking_target_id"?: string | null,"oauth_client_state_id"?: string | null,"provider_access_token"?: string | null,"provider_refresh_token"?: string | null,"provider_type"?: string,"referrer"?: string | null,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"identities": {
                  Row: {
                    "created_at": string | null,"email": string | null,"id": string,"identity_data": NonNullable<Json>,"last_sign_in_at": string | null,"provider": string,"provider_id": string,"updated_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"email"?: never,"id"?: string,"identity_data": NonNullable<Json>,"last_sign_in_at"?: string | null,"provider": string,"provider_id": string,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"email"?: never,"id"?: string,"identity_data"?: NonNullable<Json>,"last_sign_in_at"?: string | null,"provider"?: string,"provider_id"?: string,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "identities_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"instances": {
                  Row: {
                    "created_at": string | null,"id": string,"raw_base_config": string | null,"updated_at": string | null,"uuid": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id": string,"raw_base_config"?: string | null,"updated_at"?: string | null,"uuid"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"raw_base_config"?: string | null,"updated_at"?: string | null,"uuid"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"mfa_amr_claims": {
                  Row: {
                    "authentication_method": string,"created_at": string,"id": string,"session_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "authentication_method": string,"created_at": string,"id": string,"session_id": string,"updated_at": string
                  }
                  Update: {
                    "authentication_method"?: string,"created_at"?: string,"id"?: string,"session_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mfa_amr_claims_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"mfa_challenges": {
                  Row: {
                    "created_at": string,"factor_id": string,"id": string,"ip_address": unknown,"otp_code": string | null,"verified_at": string | null,"web_authn_session_data": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at": string,"factor_id": string,"id": string,"ip_address": unknown,"otp_code"?: string | null,"verified_at"?: string | null,"web_authn_session_data"?: Json | null
                  }
                  Update: {
                    "created_at"?: string,"factor_id"?: string,"id"?: string,"ip_address"?: unknown,"otp_code"?: string | null,"verified_at"?: string | null,"web_authn_session_data"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mfa_challenges_auth_factor_id_fkey"
      columns: ["factor_id"]
isOneToOne: false
      referencedRelation: "mfa_factors"
      referencedColumns: ["id"]
    }
                  ]
                },"mfa_factors": {
                  Row: {
                    "created_at": string,"factor_type": Database["auth"]['Enums']["factor_type"],"friendly_name": string | null,"id": string,"last_challenged_at": string | null,"last_webauthn_challenge_data": Json | null,"phone": string | null,"secret": string | null,"status": Database["auth"]['Enums']["factor_status"],"updated_at": string,"user_id": string,"web_authn_aaguid": string | null,"web_authn_credential": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at": string,"factor_type": Database["auth"]['Enums']["factor_type"],"friendly_name"?: string | null,"id": string,"last_challenged_at"?: string | null,"last_webauthn_challenge_data"?: Json | null,"phone"?: string | null,"secret"?: string | null,"status": Database["auth"]['Enums']["factor_status"],"updated_at": string,"user_id": string,"web_authn_aaguid"?: string | null,"web_authn_credential"?: Json | null
                  }
                  Update: {
                    "created_at"?: string,"factor_type"?: Database["auth"]['Enums']["factor_type"],"friendly_name"?: string | null,"id"?: string,"last_challenged_at"?: string | null,"last_webauthn_challenge_data"?: Json | null,"phone"?: string | null,"secret"?: string | null,"status"?: Database["auth"]['Enums']["factor_status"],"updated_at"?: string,"user_id"?: string,"web_authn_aaguid"?: string | null,"web_authn_credential"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mfa_factors_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"mfa_recovery_code_sets": {
                  Row: {
                    "created_at": string,"failed_verification_count": number,"id": string,"mfa_factor_id": string,"updated_at": string,"user_id": string,"verification_locked_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"failed_verification_count"?: number,"id": string,"mfa_factor_id": string,"updated_at"?: string,"user_id": string,"verification_locked_until"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"failed_verification_count"?: number,"id"?: string,"mfa_factor_id"?: string,"updated_at"?: string,"user_id"?: string,"verification_locked_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mfa_recovery_code_sets_mfa_factor_id_fkey"
      columns: ["mfa_factor_id"]
isOneToOne: true
      referencedRelation: "mfa_factors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mfa_recovery_code_sets_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"mfa_recovery_codes": {
                  Row: {
                    "code_hash": string,"consumed_at": string | null,"created_at": string,"id": string,"mfa_recovery_code_set_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code_hash": string,"consumed_at"?: string | null,"created_at"?: string,"id": string,"mfa_recovery_code_set_id": string
                  }
                  Update: {
                    "code_hash"?: string,"consumed_at"?: string | null,"created_at"?: string,"id"?: string,"mfa_recovery_code_set_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mfa_recovery_codes_mfa_recovery_code_set_id_fkey"
      columns: ["mfa_recovery_code_set_id"]
isOneToOne: false
      referencedRelation: "mfa_recovery_code_sets"
      referencedColumns: ["id"]
    }
                  ]
                },"oauth_authorizations": {
                  Row: {
                    "approved_at": string | null,"authorization_code": string | null,"authorization_id": string,"client_id": string,"code_challenge": string | null,"code_challenge_method": Database["auth"]['Enums']["code_challenge_method"] | null,"created_at": string,"expires_at": string,"id": string,"nonce": string | null,"redirect_uri": string,"resource": string | null,"response_type": Database["auth"]['Enums']["oauth_response_type"],"scope": string,"state": string | null,"status": Database["auth"]['Enums']["oauth_authorization_status"],"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"authorization_code"?: string | null,"authorization_id": string,"client_id": string,"code_challenge"?: string | null,"code_challenge_method"?: Database["auth"]['Enums']["code_challenge_method"] | null,"created_at"?: string,"expires_at"?: string,"id": string,"nonce"?: string | null,"redirect_uri": string,"resource"?: string | null,"response_type"?: Database["auth"]['Enums']["oauth_response_type"],"scope": string,"state"?: string | null,"status"?: Database["auth"]['Enums']["oauth_authorization_status"],"user_id"?: string | null
                  }
                  Update: {
                    "approved_at"?: string | null,"authorization_code"?: string | null,"authorization_id"?: string,"client_id"?: string,"code_challenge"?: string | null,"code_challenge_method"?: Database["auth"]['Enums']["code_challenge_method"] | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"nonce"?: string | null,"redirect_uri"?: string,"resource"?: string | null,"response_type"?: Database["auth"]['Enums']["oauth_response_type"],"scope"?: string,"state"?: string | null,"status"?: Database["auth"]['Enums']["oauth_authorization_status"],"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "oauth_authorizations_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "oauth_clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "oauth_authorizations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"oauth_client_states": {
                  Row: {
                    "code_verifier": string | null,"created_at": string,"id": string,"provider_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code_verifier"?: string | null,"created_at": string,"id": string,"provider_type": string
                  }
                  Update: {
                    "code_verifier"?: string | null,"created_at"?: string,"id"?: string,"provider_type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"oauth_clients": {
                  Row: {
                    "client_name": string | null,"client_secret_hash": string | null,"client_type": Database["auth"]['Enums']["oauth_client_type"],"client_uri": string | null,"created_at": string,"deleted_at": string | null,"grant_types": string,"id": string,"logo_uri": string | null,"redirect_uris": string,"registration_type": Database["auth"]['Enums']["oauth_registration_type"],"token_endpoint_auth_method": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_name"?: string | null,"client_secret_hash"?: string | null,"client_type"?: Database["auth"]['Enums']["oauth_client_type"],"client_uri"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"grant_types": string,"id": string,"logo_uri"?: string | null,"redirect_uris": string,"registration_type": Database["auth"]['Enums']["oauth_registration_type"],"token_endpoint_auth_method": string,"updated_at"?: string
                  }
                  Update: {
                    "client_name"?: string | null,"client_secret_hash"?: string | null,"client_type"?: Database["auth"]['Enums']["oauth_client_type"],"client_uri"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"grant_types"?: string,"id"?: string,"logo_uri"?: string | null,"redirect_uris"?: string,"registration_type"?: Database["auth"]['Enums']["oauth_registration_type"],"token_endpoint_auth_method"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"oauth_consents": {
                  Row: {
                    "client_id": string,"granted_at": string,"id": string,"revoked_at": string | null,"scopes": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"granted_at"?: string,"id": string,"revoked_at"?: string | null,"scopes": string,"user_id": string
                  }
                  Update: {
                    "client_id"?: string,"granted_at"?: string,"id"?: string,"revoked_at"?: string | null,"scopes"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "oauth_consents_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "oauth_clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "oauth_consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"one_time_tokens": {
                  Row: {
                    "created_at": string,"expires_at": string | null,"id": string,"link_token_hash": string | null,"relates_to": string,"token_hash": string,"token_type": Database["auth"]['Enums']["one_time_token_type"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at"?: string | null,"id": string,"link_token_hash"?: string | null,"relates_to": string,"token_hash": string,"token_type": Database["auth"]['Enums']["one_time_token_type"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: string,"link_token_hash"?: string | null,"relates_to"?: string,"token_hash"?: string,"token_type"?: Database["auth"]['Enums']["one_time_token_type"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "one_time_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"refresh_tokens": {
                  Row: {
                    "created_at": string | null,"id": number,"instance_id": string | null,"parent": string | null,"revoked": boolean | null,"session_id": string | null,"token": string | null,"updated_at": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: number,"instance_id"?: string | null,"parent"?: string | null,"revoked"?: boolean | null,"session_id"?: string | null,"token"?: string | null,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: number,"instance_id"?: string | null,"parent"?: string | null,"revoked"?: boolean | null,"session_id"?: string | null,"token"?: string | null,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "refresh_tokens_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"saml_providers": {
                  Row: {
                    "attribute_mapping": Json | null,"created_at": string | null,"dedicated_scope": boolean | null,"entity_id": string,"id": string,"metadata_url": string | null,"metadata_xml": string,"name_id_format": string | null,"sso_provider_id": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attribute_mapping"?: Json | null,"created_at"?: string | null,"dedicated_scope"?: boolean | null,"entity_id": string,"id": string,"metadata_url"?: string | null,"metadata_xml": string,"name_id_format"?: string | null,"sso_provider_id": string,"updated_at"?: string | null
                  }
                  Update: {
                    "attribute_mapping"?: Json | null,"created_at"?: string | null,"dedicated_scope"?: boolean | null,"entity_id"?: string,"id"?: string,"metadata_url"?: string | null,"metadata_xml"?: string,"name_id_format"?: string | null,"sso_provider_id"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "saml_providers_sso_provider_id_fkey"
      columns: ["sso_provider_id"]
isOneToOne: false
      referencedRelation: "sso_providers"
      referencedColumns: ["id"]
    }
                  ]
                },"saml_relay_states": {
                  Row: {
                    "created_at": string | null,"flow_state_id": string | null,"for_email": string | null,"id": string,"redirect_to": string | null,"request_id": string,"sso_provider_id": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"flow_state_id"?: string | null,"for_email"?: string | null,"id": string,"redirect_to"?: string | null,"request_id": string,"sso_provider_id": string,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"flow_state_id"?: string | null,"for_email"?: string | null,"id"?: string,"redirect_to"?: string | null,"request_id"?: string,"sso_provider_id"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "saml_relay_states_flow_state_id_fkey"
      columns: ["flow_state_id"]
isOneToOne: false
      referencedRelation: "flow_state"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saml_relay_states_sso_provider_id_fkey"
      columns: ["sso_provider_id"]
isOneToOne: false
      referencedRelation: "sso_providers"
      referencedColumns: ["id"]
    }
                  ]
                },"schema_migrations": {
                  Row: {
                    "version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "version": string
                  }
                  Update: {
                    "version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"scim_tokens": {
                  Row: {
                    "created_at": string,"expires_at": string | null,"id": string,"last_used_at": string | null,"prefix": string,"revoked_at": string | null,"sso_provider_id": string,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at"?: string | null,"id": string,"last_used_at"?: string | null,"prefix": string,"revoked_at"?: string | null,"sso_provider_id": string,"token_hash": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string | null,"id"?: string,"last_used_at"?: string | null,"prefix"?: string,"revoked_at"?: string | null,"sso_provider_id"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "scim_tokens_sso_provider_id_fkey"
      columns: ["sso_provider_id"]
isOneToOne: false
      referencedRelation: "sso_providers"
      referencedColumns: ["id"]
    }
                  ]
                },"scim_users": {
                  Row: {
                    "active": boolean,"created_at": string,"deleted_at": string | null,"external_id": string | null,"id": string,"resource": NonNullable<Json>,"sso_provider_id": string,"updated_at": string,"user_id": string | null,"user_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: never,"created_at"?: string,"deleted_at"?: string | null,"external_id"?: never,"id": string,"resource": NonNullable<Json>,"sso_provider_id": string,"updated_at"?: string,"user_id"?: string | null,"user_name"?: never
                  }
                  Update: {
                    "active"?: never,"created_at"?: string,"deleted_at"?: string | null,"external_id"?: never,"id"?: string,"resource"?: NonNullable<Json>,"sso_provider_id"?: string,"updated_at"?: string,"user_id"?: string | null,"user_name"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "scim_users_sso_provider_id_fkey"
      columns: ["sso_provider_id"]
isOneToOne: false
      referencedRelation: "sso_providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scim_users_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "aal": Database["auth"]['Enums']["aal_level"] | null,"created_at": string | null,"factor_id": string | null,"id": string,"ip": unknown,"not_after": string | null,"oauth_client_id": string | null,"refresh_token_counter": number | null,"refresh_token_hmac_key": string | null,"refreshed_at": string | null,"scopes": string | null,"tag": string | null,"updated_at": string | null,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aal"?: Database["auth"]['Enums']["aal_level"] | null,"created_at"?: string | null,"factor_id"?: string | null,"id": string,"ip"?: unknown,"not_after"?: string | null,"oauth_client_id"?: string | null,"refresh_token_counter"?: number | null,"refresh_token_hmac_key"?: string | null,"refreshed_at"?: string | null,"scopes"?: string | null,"tag"?: string | null,"updated_at"?: string | null,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "aal"?: Database["auth"]['Enums']["aal_level"] | null,"created_at"?: string | null,"factor_id"?: string | null,"id"?: string,"ip"?: unknown,"not_after"?: string | null,"oauth_client_id"?: string | null,"refresh_token_counter"?: number | null,"refresh_token_hmac_key"?: string | null,"refreshed_at"?: string | null,"scopes"?: string | null,"tag"?: string | null,"updated_at"?: string | null,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_oauth_client_id_fkey"
      columns: ["oauth_client_id"]
isOneToOne: false
      referencedRelation: "oauth_clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"sso_domains": {
                  Row: {
                    "created_at": string | null,"domain": string,"id": string,"sso_provider_id": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"domain": string,"id": string,"sso_provider_id": string,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"domain"?: string,"id"?: string,"sso_provider_id"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sso_domains_sso_provider_id_fkey"
      columns: ["sso_provider_id"]
isOneToOne: false
      referencedRelation: "sso_providers"
      referencedColumns: ["id"]
    }
                  ]
                },"sso_providers": {
                  Row: {
                    "created_at": string | null,"disabled": boolean | null,"id": string,"resource_id": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"disabled"?: boolean | null,"id": string,"resource_id"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"disabled"?: boolean | null,"id"?: string,"resource_id"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"users": {
                  Row: {
                    "aud": string | null,"banned_until": string | null,"confirmation_sent_at": string | null,"confirmation_token": string | null,"confirmed_at": string | null,"created_at": string | null,"deleted_at": string | null,"email": string | null,"email_change": string | null,"email_change_confirm_status": number | null,"email_change_sent_at": string | null,"email_change_token_current": string | null,"email_change_token_new": string | null,"email_confirmed_at": string | null,"encrypted_password": string | null,"id": string,"instance_id": string | null,"invited_at": string | null,"is_anonymous": boolean,"is_sso_user": boolean,"is_super_admin": boolean | null,"last_sign_in_at": string | null,"phone": string | null,"phone_change": string | null,"phone_change_sent_at": string | null,"phone_change_token": string | null,"phone_confirmed_at": string | null,"raw_app_meta_data": Json | null,"raw_user_meta_data": Json | null,"reauthentication_sent_at": string | null,"reauthentication_token": string | null,"recovery_sent_at": string | null,"recovery_token": string | null,"role": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aud"?: string | null,"banned_until"?: string | null,"confirmation_sent_at"?: string | null,"confirmation_token"?: string | null,"confirmed_at"?: never,"created_at"?: string | null,"deleted_at"?: string | null,"email"?: string | null,"email_change"?: string | null,"email_change_confirm_status"?: number | null,"email_change_sent_at"?: string | null,"email_change_token_current"?: string | null,"email_change_token_new"?: string | null,"email_confirmed_at"?: string | null,"encrypted_password"?: string | null,"id": string,"instance_id"?: string | null,"invited_at"?: string | null,"is_anonymous"?: boolean,"is_sso_user"?: boolean,"is_super_admin"?: boolean | null,"last_sign_in_at"?: string | null,"phone"?: string | null,"phone_change"?: string | null,"phone_change_sent_at"?: string | null,"phone_change_token"?: string | null,"phone_confirmed_at"?: string | null,"raw_app_meta_data"?: Json | null,"raw_user_meta_data"?: Json | null,"reauthentication_sent_at"?: string | null,"reauthentication_token"?: string | null,"recovery_sent_at"?: string | null,"recovery_token"?: string | null,"role"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "aud"?: string | null,"banned_until"?: string | null,"confirmation_sent_at"?: string | null,"confirmation_token"?: string | null,"confirmed_at"?: never,"created_at"?: string | null,"deleted_at"?: string | null,"email"?: string | null,"email_change"?: string | null,"email_change_confirm_status"?: number | null,"email_change_sent_at"?: string | null,"email_change_token_current"?: string | null,"email_change_token_new"?: string | null,"email_confirmed_at"?: string | null,"encrypted_password"?: string | null,"id"?: string,"instance_id"?: string | null,"invited_at"?: string | null,"is_anonymous"?: boolean,"is_sso_user"?: boolean,"is_super_admin"?: boolean | null,"last_sign_in_at"?: string | null,"phone"?: string | null,"phone_change"?: string | null,"phone_change_sent_at"?: string | null,"phone_change_token"?: string | null,"phone_confirmed_at"?: string | null,"raw_app_meta_data"?: Json | null,"raw_user_meta_data"?: Json | null,"reauthentication_sent_at"?: string | null,"reauthentication_token"?: string | null,"recovery_sent_at"?: string | null,"recovery_token"?: string | null,"role"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"webauthn_challenges": {
                  Row: {
                    "challenge_type": string,"created_at": string,"expires_at": string,"id": string,"session_data": NonNullable<Json>,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_type": string,"created_at"?: string,"expires_at": string,"id"?: string,"session_data": NonNullable<Json>,"user_id"?: string | null
                  }
                  Update: {
                    "challenge_type"?: string,"created_at"?: string,"expires_at"?: string,"id"?: string,"session_data"?: NonNullable<Json>,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "webauthn_challenges_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"webauthn_credentials": {
                  Row: {
                    "aaguid": string | null,"attestation_type": string,"backed_up": boolean,"backup_eligible": boolean,"created_at": string,"credential_id": string,"friendly_name": string,"id": string,"last_used_at": string | null,"public_key": string,"sign_count": number,"transports": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aaguid"?: string | null,"attestation_type"?: string,"backed_up"?: boolean,"backup_eligible"?: boolean,"created_at"?: string,"credential_id": string,"friendly_name"?: string,"id"?: string,"last_used_at"?: string | null,"public_key": string,"sign_count"?: number,"transports"?: NonNullable<Json>,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "aaguid"?: string | null,"attestation_type"?: string,"backed_up"?: boolean,"backup_eligible"?: boolean,"created_at"?: string,"credential_id"?: string,"friendly_name"?: string,"id"?: string,"last_used_at"?: string | null,"public_key"?: string,"sign_count"?: number,"transports"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "webauthn_credentials_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "email":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"jwt":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"role":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"uid":
{ Args: Record<PropertyKey, never>; Returns: string
                           }
          }
          Enums: {
            "aal_level": "aal1"|"aal2"|"aal3","code_challenge_method": "s256"|"plain","factor_status": "unverified"|"verified","factor_type": "totp"|"webauthn"|"phone"|"recovery_code","oauth_authorization_status": "pending"|"approved"|"denied"|"expired","oauth_client_type": "public"|"confidential","oauth_registration_type": "dynamic"|"manual","oauth_response_type": "code","one_time_token_type": "confirmation_token"|"reauthentication_token"|"recovery_token"|"email_change_token_new"|"email_change_token_current"|"phone_change_token"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "account_deletion_log": {
                  Row: {
                    "anonymized_ref": string,"deleted_at": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anonymized_ref": string,"deleted_at"?: string,"id"?: string
                  }
                  Update: {
                    "anonymized_ref"?: string,"deleted_at"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"appliances": {
                  Row: {
                    "archived_at": string | null,"brand": string | null,"category": Database["public"]['Enums']["appliance_category"],"created_at": string,"home_id": string,"id": string,"model": string | null,"name": string,"notes": string | null,"purchase_date": string | null,"room_id": string | null,"serial_number": string | null,"updated_at": string,"warranty_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"brand"?: string | null,"category"?: Database["public"]['Enums']["appliance_category"],"created_at"?: string,"home_id": string,"id"?: string,"model"?: string | null,"name": string,"notes"?: string | null,"purchase_date"?: string | null,"room_id"?: string | null,"serial_number"?: string | null,"updated_at"?: string,"warranty_until"?: string | null
                  }
                  Update: {
                    "archived_at"?: string | null,"brand"?: string | null,"category"?: Database["public"]['Enums']["appliance_category"],"created_at"?: string,"home_id"?: string,"id"?: string,"model"?: string | null,"name"?: string,"notes"?: string | null,"purchase_date"?: string | null,"room_id"?: string | null,"serial_number"?: string | null,"updated_at"?: string,"warranty_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "appliances_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appliances_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"attachments": {
                  Row: {
                    "appliance_id": string | null,"created_at": string,"file_name": string,"file_path": string,"home_id": string,"id": string,"issue_id": string | null,"kind": Database["public"]['Enums']["attachment_kind"],"maintenance_id": string | null,"mime_type": string,"size_bytes": number,"updated_at": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "appliance_id"?: string | null,"created_at"?: string,"file_name": string,"file_path": string,"home_id": string,"id"?: string,"issue_id"?: string | null,"kind": Database["public"]['Enums']["attachment_kind"],"maintenance_id"?: string | null,"mime_type": string,"size_bytes": number,"updated_at"?: string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "appliance_id"?: string | null,"created_at"?: string,"file_name"?: string,"file_path"?: string,"home_id"?: string,"id"?: string,"issue_id"?: string | null,"kind"?: Database["public"]['Enums']["attachment_kind"],"maintenance_id"?: string | null,"mime_type"?: string,"size_bytes"?: number,"updated_at"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attachments_appliance_id_fkey"
      columns: ["appliance_id"]
isOneToOne: false
      referencedRelation: "appliances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_issue_id_fkey"
      columns: ["issue_id"]
isOneToOne: false
      referencedRelation: "home_issues"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_maintenance_id_fkey"
      columns: ["maintenance_id"]
isOneToOne: false
      referencedRelation: "maintenance_records"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "created_at": string,"created_by": string,"description": string | null,"end_date": string | null,"end_time": string | null,"event_type": Database["public"]['Enums']["event_type"],"home_id": string,"id": string,"start_date": string,"start_time": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string,"description"?: string | null,"end_date"?: string | null,"end_time"?: string | null,"event_type"?: Database["public"]['Enums']["event_type"],"home_id": string,"id"?: string,"start_date": string,"start_time"?: string | null,"title": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"description"?: string | null,"end_date"?: string | null,"end_time"?: string | null,"event_type"?: Database["public"]['Enums']["event_type"],"home_id"?: string,"id"?: string,"start_date"?: string,"start_time"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    }
                  ]
                },"home_invites": {
                  Row: {
                    "created_at": string,"expires_at": string,"home_id": string,"id": string,"invited_by": string,"invited_email": string,"role": Database["public"]['Enums']["home_role"],"status": Database["public"]['Enums']["invite_status"],"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at"?: string,"home_id": string,"id"?: string,"invited_by": string,"invited_email": string,"role"?: Database["public"]['Enums']["home_role"],"status"?: Database["public"]['Enums']["invite_status"],"token"?: string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"home_id"?: string,"id"?: string,"invited_by"?: string,"invited_email"?: string,"role"?: Database["public"]['Enums']["home_role"],"status"?: Database["public"]['Enums']["invite_status"],"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "home_invites_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    }
                  ]
                },"home_issues": {
                  Row: {
                    "appliance_id": string | null,"created_at": string,"created_by": string | null,"description": string | null,"home_id": string,"id": string,"notify_landlord": boolean,"reported_at": string,"resolved_at": string | null,"room_id": string | null,"status": Database["public"]['Enums']["issue_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appliance_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"home_id": string,"id"?: string,"notify_landlord"?: boolean,"reported_at"?: string,"resolved_at"?: string | null,"room_id"?: string | null,"status"?: Database["public"]['Enums']["issue_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "appliance_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"home_id"?: string,"id"?: string,"notify_landlord"?: boolean,"reported_at"?: string,"resolved_at"?: string | null,"room_id"?: string | null,"status"?: Database["public"]['Enums']["issue_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "home_issues_appliance_id_fkey"
      columns: ["appliance_id"]
isOneToOne: false
      referencedRelation: "appliances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "home_issues_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "home_issues_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "home_issues_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"home_members": {
                  Row: {
                    "absence_end": string | null,"absence_start": string | null,"created_at": string,"home_id": string,"id": string,"role": Database["public"]['Enums']["home_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "absence_end"?: string | null,"absence_start"?: string | null,"created_at"?: string,"home_id": string,"id"?: string,"role"?: Database["public"]['Enums']["home_role"],"user_id": string
                  }
                  Update: {
                    "absence_end"?: string | null,"absence_start"?: string | null,"created_at"?: string,"home_id"?: string,"id"?: string,"role"?: Database["public"]['Enums']["home_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "home_members_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "home_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"homes": {
                  Row: {
                    "available_minutes_per_week": number | null,"created_at": string,"created_by": string | null,"household_type": Database["public"]['Enums']["household_type"] | null,"id": string,"name": string,"ownership_type": Database["public"]['Enums']["ownership_type"] | null,"property_type": Database["public"]['Enums']["property_type"] | null,"resident_count": number | null,"routine_level": Database["public"]['Enums']["routine_level"] | null,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "available_minutes_per_week"?: number | null,"created_at"?: string,"created_by"?: string | null,"household_type"?: Database["public"]['Enums']["household_type"] | null,"id"?: string,"name": string,"ownership_type"?: Database["public"]['Enums']["ownership_type"] | null,"property_type"?: Database["public"]['Enums']["property_type"] | null,"resident_count"?: number | null,"routine_level"?: Database["public"]['Enums']["routine_level"] | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "available_minutes_per_week"?: number | null,"created_at"?: string,"created_by"?: string | null,"household_type"?: Database["public"]['Enums']["household_type"] | null,"id"?: string,"name"?: string,"ownership_type"?: Database["public"]['Enums']["ownership_type"] | null,"property_type"?: Database["public"]['Enums']["property_type"] | null,"resident_count"?: number | null,"routine_level"?: Database["public"]['Enums']["routine_level"] | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "homes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"issue_events": {
                  Row: {
                    "created_at": string,"created_by": string | null,"event_type": Database["public"]['Enums']["issue_event_type"],"from_status": Database["public"]['Enums']["issue_status"] | null,"home_id": string,"id": string,"issue_id": string,"note": string | null,"to_status": Database["public"]['Enums']["issue_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"event_type": Database["public"]['Enums']["issue_event_type"],"from_status"?: Database["public"]['Enums']["issue_status"] | null,"home_id": string,"id"?: string,"issue_id": string,"note"?: string | null,"to_status"?: Database["public"]['Enums']["issue_status"] | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"event_type"?: Database["public"]['Enums']["issue_event_type"],"from_status"?: Database["public"]['Enums']["issue_status"] | null,"home_id"?: string,"id"?: string,"issue_id"?: string,"note"?: string | null,"to_status"?: Database["public"]['Enums']["issue_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "issue_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "issue_events_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "issue_events_issue_id_fkey"
      columns: ["issue_id"]
isOneToOne: false
      referencedRelation: "home_issues"
      referencedColumns: ["id"]
    }
                  ]
                },"maintenance_records": {
                  Row: {
                    "appliance_id": string | null,"completed_at": string | null,"cost_cents": number | null,"created_at": string,"created_by": string | null,"description": string | null,"home_id": string,"id": string,"issue_id": string | null,"notes": string | null,"provider_name": string | null,"room_id": string | null,"scheduled_for": string | null,"status": Database["public"]['Enums']["maintenance_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appliance_id"?: string | null,"completed_at"?: string | null,"cost_cents"?: number | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"home_id": string,"id"?: string,"issue_id"?: string | null,"notes"?: string | null,"provider_name"?: string | null,"room_id"?: string | null,"scheduled_for"?: string | null,"status"?: Database["public"]['Enums']["maintenance_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "appliance_id"?: string | null,"completed_at"?: string | null,"cost_cents"?: number | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"home_id"?: string,"id"?: string,"issue_id"?: string | null,"notes"?: string | null,"provider_name"?: string | null,"room_id"?: string | null,"scheduled_for"?: string | null,"status"?: Database["public"]['Enums']["maintenance_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "maintenance_records_appliance_id_fkey"
      columns: ["appliance_id"]
isOneToOne: false
      referencedRelation: "appliances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_records_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_records_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_records_issue_id_fkey"
      columns: ["issue_id"]
isOneToOne: false
      referencedRelation: "home_issues"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_records_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"pro_interest": {
                  Row: {
                    "created_at": string,"id": string,"price_option": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"price_option": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"price_option"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pro_interest_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"product_events": {
                  Row: {
                    "created_at": string,"event_name": string,"home_id": string | null,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_name": string,"home_id"?: string | null,"id"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"event_name"?: string,"home_id"?: string | null,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_events_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"current_home_id": string | null,"full_name": string | null,"id": string,"last_seen_at": string | null,"marketing_opt_in": boolean,"onboarding_completed": boolean,"onboarding_step": number,"terms_accepted_at": string | null,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"current_home_id"?: string | null,"full_name"?: string | null,"id": string,"last_seen_at"?: string | null,"marketing_opt_in"?: boolean,"onboarding_completed"?: boolean,"onboarding_step"?: number,"terms_accepted_at"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"current_home_id"?: string | null,"full_name"?: string | null,"id"?: string,"last_seen_at"?: string | null,"marketing_opt_in"?: boolean,"onboarding_completed"?: boolean,"onboarding_step"?: number,"terms_accepted_at"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_current_home_id_fkey"
      columns: ["current_home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"last_used_at": string | null,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"last_used_at"?: string | null,"p256dh": string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"last_used_at"?: string | null,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "created_at": string,"home_id": string,"id": string,"name": string,"position": number,"room_type": Database["public"]['Enums']["room_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"home_id": string,"id"?: string,"name": string,"position"?: number,"room_type"?: Database["public"]['Enums']["room_type"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"home_id"?: string,"id"?: string,"name"?: string,"position"?: number,"room_type"?: Database["public"]['Enums']["room_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rooms_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    }
                  ]
                },"routines": {
                  Row: {
                    "created_at": string,"end_date": string | null,"frequency_type": Database["public"]['Enums']["frequency_type"],"generated_until": string | null,"home_id": string,"id": string,"interval_unit": Database["public"]['Enums']["interval_unit"] | null,"interval_value": number,"is_active": boolean,"month_day": number | null,"start_date": string,"task_id": string,"ungenerated_count": number,"updated_at": string,"weekdays": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_date"?: string | null,"frequency_type": Database["public"]['Enums']["frequency_type"],"generated_until"?: string | null,"home_id": string,"id"?: string,"interval_unit"?: Database["public"]['Enums']["interval_unit"] | null,"interval_value"?: number,"is_active"?: boolean,"month_day"?: number | null,"start_date": string,"task_id": string,"ungenerated_count"?: number,"updated_at"?: string,"weekdays"?: (number)[]
                  }
                  Update: {
                    "created_at"?: string,"end_date"?: string | null,"frequency_type"?: Database["public"]['Enums']["frequency_type"],"generated_until"?: string | null,"home_id"?: string,"id"?: string,"interval_unit"?: Database["public"]['Enums']["interval_unit"] | null,"interval_value"?: number,"is_active"?: boolean,"month_day"?: number | null,"start_date"?: string,"task_id"?: string,"ungenerated_count"?: number,"updated_at"?: string,"weekdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "routines_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "routines_task_id_fkey"
      columns: ["task_id"]
isOneToOne: true
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"shopping_items": {
                  Row: {
                    "category": Database["public"]['Enums']["shopping_category"],"created_at": string,"created_by": string | null,"home_id": string,"id": string,"is_purchased": boolean,"issue_id": string | null,"name": string,"purchased_at": string | null,"purchased_by": string | null,"quantity": number,"unit": Database["public"]['Enums']["shopping_unit"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["shopping_category"],"created_at"?: string,"created_by"?: string | null,"home_id": string,"id"?: string,"is_purchased"?: boolean,"issue_id"?: string | null,"name": string,"purchased_at"?: string | null,"purchased_by"?: string | null,"quantity"?: number,"unit"?: Database["public"]['Enums']["shopping_unit"],"updated_at"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["shopping_category"],"created_at"?: string,"created_by"?: string | null,"home_id"?: string,"id"?: string,"is_purchased"?: boolean,"issue_id"?: string | null,"name"?: string,"purchased_at"?: string | null,"purchased_by"?: string | null,"quantity"?: number,"unit"?: Database["public"]['Enums']["shopping_unit"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopping_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_items_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_items_issue_id_fkey"
      columns: ["issue_id"]
isOneToOne: false
      referencedRelation: "home_issues"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_items_purchased_by_fkey"
      columns: ["purchased_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "created_at": string,"current_period_end": string | null,"current_period_start": string | null,"id": string,"plan": Database["public"]['Enums']["subscription_plan"],"provider": Database["public"]['Enums']["subscription_provider"],"provider_customer_id": string | null,"provider_subscription_id": string | null,"status": Database["public"]['Enums']["subscription_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"id"?: string,"plan"?: Database["public"]['Enums']["subscription_plan"],"provider"?: Database["public"]['Enums']["subscription_provider"],"provider_customer_id"?: string | null,"provider_subscription_id"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"id"?: string,"plan"?: Database["public"]['Enums']["subscription_plan"],"provider"?: Database["public"]['Enums']["subscription_provider"],"provider_customer_id"?: string | null,"provider_subscription_id"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"task_occurrences": {
                  Row: {
                    "completed_at": string | null,"completed_by": string | null,"created_at": string,"home_id": string,"id": string,"notes": string | null,"original_date": string,"scheduled_for": string,"status": Database["public"]['Enums']["occurrence_status"],"task_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"home_id": string,"id"?: string,"notes"?: string | null,"original_date": string,"scheduled_for": string,"status"?: Database["public"]['Enums']["occurrence_status"],"task_id": string,"updated_at"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"home_id"?: string,"id"?: string,"notes"?: string | null,"original_date"?: string,"scheduled_for"?: string,"status"?: Database["public"]['Enums']["occurrence_status"],"task_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_occurrences_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_occurrences_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_occurrences_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "appliance_id": string | null,"created_at": string,"created_by": string | null,"description": string | null,"estimated_minutes": number | null,"home_id": string,"id": string,"priority": Database["public"]['Enums']["task_priority"],"room_id": string | null,"source": Database["public"]['Enums']["task_source"],"status": Database["public"]['Enums']["task_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appliance_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"estimated_minutes"?: number | null,"home_id": string,"id"?: string,"priority"?: Database["public"]['Enums']["task_priority"],"room_id"?: string | null,"source"?: Database["public"]['Enums']["task_source"],"status"?: Database["public"]['Enums']["task_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "appliance_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"estimated_minutes"?: number | null,"home_id"?: string,"id"?: string,"priority"?: Database["public"]['Enums']["task_priority"],"room_id"?: string | null,"source"?: Database["public"]['Enums']["task_source"],"status"?: Database["public"]['Enums']["task_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_appliance_id_fkey"
      columns: ["appliance_id"]
isOneToOne: false
      referencedRelation: "appliances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invite":
{ Args: { "p_token": string }; Returns: {
              "home_id": string,"role": Database["public"]['Enums']["home_role"]
            }[]
                           },
"clear_my_absence":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"current_plan":
{ Args: { "p_user_id": string }; Returns: Database["public"]['Enums']["subscription_plan"]
                           },
"ensure_same_home":
{ Args: { "p_home_id": string,"p_id": string,"p_table": unknown }; Returns: undefined
                           },
"get_home_members":
{ Args: Record<PropertyKey, never>; Returns: {
              "absence_end": string,"absence_start": string,"avatar_url": string,"full_name": string,"joined_at": string,"role": Database["public"]['Enums']["home_role"],"user_id": string
            }[]
                           },
"has_home_role":
{ Args: { "p_home_id": string,"p_roles": (Database["public"]['Enums']["home_role"])[] }; Returns: boolean
                           },
"home_allows_attachments":
{ Args: { "p_home_id": string }; Returns: boolean
                           },
"home_owner_plan":
{ Args: { "p_home_id": string }; Returns: Database["public"]['Enums']["subscription_plan"]
                           },
"invite_member":
{ Args: { "p_email": string,"p_role"?: Database["public"]['Enums']["home_role"] }; Returns: {
              "expires_at": string,"invite_id": string,"token": string
            }[]
                           },
"is_home_member":
{ Args: { "p_home_id": string }; Returns: boolean
                           },
"plan_limits":
{ Args: { "p_plan": Database["public"]['Enums']["subscription_plan"] }; Returns: {
              "attachments_allowed": boolean,"max_active_tasks": number,"max_appliances": number,"max_homes": number
            }[]
                           },
"plan_of_user":
{ Args: { "p_user_id": string }; Returns: Database["public"]['Enums']["subscription_plan"]
                           },
"remove_member":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"revoke_invite":
{ Args: { "p_invite_id": string }; Returns: undefined
                           },
"set_my_absence":
{ Args: { "p_end": string,"p_start": string }; Returns: undefined
                           },
"storage_home_id":
{ Args: { "p_name": string }; Returns: string
                           },
"transfer_ownership":
{ Args: { "p_new_owner_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "appliance_category": "geladeira"|"maquina_lavar"|"ar_condicionado"|"micro_ondas"|"fogao"|"televisao"|"lava_loucas"|"outro","attachment_kind": "photo"|"document","event_type": "aniversario"|"viagem"|"jantar"|"consulta_medica"|"visita"|"manutencao"|"feriado"|"outros","frequency_type": "once"|"daily"|"weekly"|"biweekly"|"monthly"|"custom","home_role": "owner"|"admin"|"member","household_type": "sozinho"|"casal"|"familia"|"compartilhada"|"outro","interval_unit": "day"|"week"|"month","invite_status": "pending"|"accepted"|"revoked"|"expired","issue_event_type": "created"|"status_changed"|"note"|"maintenance_linked","issue_status": "open"|"in_progress"|"resolved","maintenance_status": "scheduled"|"completed"|"cancelled","occurrence_status": "pending"|"completed"|"skipped"|"missed","ownership_type": "proprio"|"alugado"|"outro","property_type": "apartamento"|"casa"|"sobrado"|"studio_kitnet"|"outro","room_type": "sala"|"cozinha"|"quarto"|"banheiro"|"lavanderia"|"escritorio"|"varanda"|"garagem"|"outro","routine_level": "leve"|"equilibrada"|"detalhada","shopping_category": "limpeza"|"higiene"|"cozinha"|"lavanderia"|"alimentacao"|"outros","shopping_unit": "un"|"kg"|"g"|"l"|"ml"|"pacote"|"caixa","subscription_plan": "free"|"pro","subscription_provider": "none"|"beta_grant"|"stripe"|"mercadopago","subscription_status": "active"|"trialing"|"past_due"|"canceled","task_priority": "baixa"|"media"|"alta","task_source": "manual"|"onboarding","task_status": "active"|"paused"|"archived"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "auth": {
          Enums: {
            "aal_level": ["aal1", "aal2", "aal3"],"code_challenge_method": ["s256", "plain"],"factor_status": ["unverified", "verified"],"factor_type": ["totp", "webauthn", "phone", "recovery_code"],"oauth_authorization_status": ["pending", "approved", "denied", "expired"],"oauth_client_type": ["public", "confidential"],"oauth_registration_type": ["dynamic", "manual"],"oauth_response_type": ["code"],"one_time_token_type": ["confirmation_token", "reauthentication_token", "recovery_token", "email_change_token_new", "email_change_token_current", "phone_change_token"]
          }
        },"public": {
          Enums: {
            "appliance_category": ["geladeira", "maquina_lavar", "ar_condicionado", "micro_ondas", "fogao", "televisao", "lava_loucas", "outro"],"attachment_kind": ["photo", "document"],"event_type": ["aniversario", "viagem", "jantar", "consulta_medica", "visita", "manutencao", "feriado", "outros"],"frequency_type": ["once", "daily", "weekly", "biweekly", "monthly", "custom"],"home_role": ["owner", "admin", "member"],"household_type": ["sozinho", "casal", "familia", "compartilhada", "outro"],"interval_unit": ["day", "week", "month"],"invite_status": ["pending", "accepted", "revoked", "expired"],"issue_event_type": ["created", "status_changed", "note", "maintenance_linked"],"issue_status": ["open", "in_progress", "resolved"],"maintenance_status": ["scheduled", "completed", "cancelled"],"occurrence_status": ["pending", "completed", "skipped", "missed"],"ownership_type": ["proprio", "alugado", "outro"],"property_type": ["apartamento", "casa", "sobrado", "studio_kitnet", "outro"],"room_type": ["sala", "cozinha", "quarto", "banheiro", "lavanderia", "escritorio", "varanda", "garagem", "outro"],"routine_level": ["leve", "equilibrada", "detalhada"],"shopping_category": ["limpeza", "higiene", "cozinha", "lavanderia", "alimentacao", "outros"],"shopping_unit": ["un", "kg", "g", "l", "ml", "pacote", "caixa"],"subscription_plan": ["free", "pro"],"subscription_provider": ["none", "beta_grant", "stripe", "mercadopago"],"subscription_status": ["active", "trialing", "past_due", "canceled"],"task_priority": ["baixa", "media", "alta"],"task_source": ["manual", "onboarding"],"task_status": ["active", "paused", "archived"]
          }
        }
} as const
