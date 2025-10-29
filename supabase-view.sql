-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ai_provider_configs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  provider_name character varying NOT NULL,
  api_endpoint character varying NOT NULL,
  model_name character varying NOT NULL,
  api_key_encrypted text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_provider_configs_pkey PRIMARY KEY (id),
  CONSTRAINT ai_provider_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.mind_maps (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  title character varying NOT NULL,
  content text NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mind_maps_pkey PRIMARY KEY (id),
  CONSTRAINT mind_maps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.mindmap_tags (
  mindmap_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT mindmap_tags_pkey PRIMARY KEY (mindmap_id, tag_id),
  CONSTRAINT mindmap_tags_mindmap_id_fkey FOREIGN KEY (mindmap_id) REFERENCES public.mind_maps(id),
  CONSTRAINT mindmap_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#cccccc'::text,
  is_public boolean DEFAULT false,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id),
  CONSTRAINT tags_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  username character varying NOT NULL UNIQUE,
  email character varying UNIQUE,
  password_hash text NOT NULL,
  is_admin boolean DEFAULT false,
  mind_map_permission integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  ai_permission integer DEFAULT 0,
  current_ai_config_id uuid,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_current_ai_config_id_fkey FOREIGN KEY (current_ai_config_id) REFERENCES public.ai_provider_configs(id)
);