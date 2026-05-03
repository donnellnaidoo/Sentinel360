"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type NormalizedSession = Session & {
  user: Session["user"] & {
    name: string;
  };
};

type AuthCallbackError = {
  error: {
    message: string;
    statusText: string;
  };
};

type AuthCallbacks = {
  onSuccess?: () => void;
  onError?: (error: AuthCallbackError) => void;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.",
    );
  }

  return supabase;
}

function normalizeSession(session: Session | null): NormalizedSession | null {
  if (!session) {
    return null;
  }

  const metadataName = session.user.user_metadata?.name;

  return {
    ...session,
    user: {
      ...session.user,
      name:
        typeof metadataName === "string" && metadataName.trim().length > 0
          ? metadataName
          : session.user.email ?? "Analyst",
    },
  };
}

function toAuthError(error: unknown): AuthCallbackError {
  const message = error instanceof Error ? error.message : "Authentication failed";

  return {
    error: {
      message,
      statusText: message,
    },
  };
}

export const authClient = {
  $Infer: {} as {
    Session: NormalizedSession;
  },
  useSession() {
    const [data, setData] = useState<NormalizedSession | null>(null);
    const [isPending, setIsPending] = useState(true);

    useEffect(() => {
      if (!supabase) {
        setIsPending(false);
        return;
      }

      let isMounted = true;

      supabase.auth
        .getSession()
        .then(({ data: sessionData, error }) => {
          if (!isMounted) {
            return;
          }

          if (error) {
            setData(null);
            setIsPending(false);
            return;
          }

          setData(normalizeSession(sessionData.session));
          setIsPending(false);
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }

          setData(null);
          setIsPending(false);
        });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) {
          return;
        }

        setData(normalizeSession(session));
        setIsPending(false);
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }, []);

    return { data, isPending };
  },
  async getSession() {
    const client = requireSupabase();
    const { data, error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    return {
      data: {
        session: normalizeSession(data.session),
      },
      error: null,
    };
  },
  signIn: {
    async email(
      credentials: { email: string; password: string },
      callbacks: AuthCallbacks = {},
    ) {
      const client = requireSupabase();
      const { error } = await client.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        callbacks.onError?.(toAuthError(error));
        return;
      }

      callbacks.onSuccess?.();
    },
  },
  signUp: {
    async email(
      credentials: { email: string; password: string; name: string },
      callbacks: AuthCallbacks = {},
    ) {
      const client = requireSupabase();
      const { error } = await client.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name,
          },
        },
      });

      if (error) {
        callbacks.onError?.(toAuthError(error));
        return;
      }

      callbacks.onSuccess?.();
    },
  },
  async signOut(options: { fetchOptions?: AuthCallbacks } = {}) {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();

    if (error) {
      options.fetchOptions?.onError?.(toAuthError(error));
      return;
    }

    options.fetchOptions?.onSuccess?.();
  },
};
