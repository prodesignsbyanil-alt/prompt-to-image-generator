import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { provider, apiKey, prompt } = await req.json();
    if (!provider || !apiKey || !prompt)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    let apiUrl = "";
    let body = {};
    let headers = { "Content-Type": "application/json" };

    if (provider === "openai") {
      apiUrl = "https://api.openai.com/v1/images/generations";
      headers["Authorization"] = `Bearer ${apiKey}`;
      body = { model: "gpt-image-1", prompt, size: "1024x1024" };
    } else if (provider === "gemini") {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-2:generateImage?key=${apiKey}`;
      body = { prompt, size: "1024x1024" };
    } else if (provider === "stability") {
      apiUrl = "https://api.stability.ai/v1/generation/sd3/text-to-image";
      headers["Authorization"] = `Bearer ${apiKey}`;
      body = { prompt, width: 1024, height: 1024, output_format: "png" };
    } else {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || "API error");

    const b64 =
      json?.data?.[0]?.b64_json ||
      json?.image?.base64 ||
      json?.images?.[0]?.base64 ||
      json?.artifacts?.[0]?.base64 ||
      json?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    if (!b64) throw new Error("No base64 image found");

    return NextResponse.json({ dataUrl: `data:image/png;base64,${b64}` });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
