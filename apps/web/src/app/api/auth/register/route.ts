import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  // POPIA s11: registration is refused without explicit, affirmative
  // consent — this must be `true`, not merely present.
  popiaConsent: z.literal(true, {
    error: "You must accept the privacy policy to create an account",
  }),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const popiaConsentAt = new Date().toISOString();

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, popiaConsentAt },
    },
  });

  if (error) {
    return NextResponse.json({ error: "Registration failed", message: error.message }, {
      status: 400,
    });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
