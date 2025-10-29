import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { provider, apiKey, prompt, size = "1024x1024" } = await req.json();

    if (!provider || !apiKey || !prompt) {
      return NextResponse.json({ error: "Missing provider/apiKey/prompt" }, { status: 400 });
    }

    let apiUrl = "";
    let headers = { "Content-Type": "application/json" };
    let body = {};

    if (provider === "openai") {
      apiUrl = "https://api.openai.com/v1/images/generations";
      headers["Authorization"] = `Bearer ${apiKey}`;
      body = { model: "gpt-image-1", prompt, size };
    } else if (provider === "gemini") {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-2:generateImage?key=${apiKey}`;
      body = { prompt, size };
    } else if (provider === "stability") {
      apiUrl = "https://api.stability.ai/v1/generation/sd3/text-to-image";
      headers["Authorization"] = `Bearer ${apiKey}`;
      body = { prompt, width: 1024, height: 1024, output_format: "png" };
    } else {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const res = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) {
      const msg = json?.error?.message || json?.message || "Upstream API error";
      return NextResponse.json({ error: msg }, { status: res.status || 500 });
    }

    // Normalize base64 sources across providers
    const b64 =
      json?.data?.[0]?.b64_json || // OpenAI
      json?.image?.base64 ||       // Gemini alt
      (json?.images && json?.images[0]?.base64) ||
      (json?.candidates && json?.candidates[0]?.content?.parts?.[0]?.inline_data?.data) ||
      (json?.artifacts && json?.artifacts[0]?.base64);

    if (!b64) {
      return NextResponse.json({ error: "No base64 image found in response" }, { status: 500 });
    }

    return NextResponse.json({ dataUrl: `data:image/png;base64,${b64}` });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
