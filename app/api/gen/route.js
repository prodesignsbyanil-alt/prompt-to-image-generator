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

    if (provider === "gemini") {
      // ✅ Proper Gemini format
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-2:generateImage?key=${apiKey}`;
      body = { instances: [{ prompt }] };
    } else if (provider === "openai") {
      apiUrl = "https://api.openai.com/v1/images/generations";
      headers["Authorization"] = `Bearer ${apiKey}`;
      body = { model: "gpt-image-1", prompt, size };
    } else if (provider === "stability") {
      apiUrl = "https://api.stability.ai/v1/generation/sd3/text-to-image";
      headers["Authorization"] = `Bearer ${apiKey}`;
      body = { prompt, width: 1024, height: 1024, output_format: "png" };
    } else {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    // 🔹 প্রথম রিকোয়েস্ট (Gemini/DALL·E/Stability)
    const res = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await res.text();

    // 🔹 রেসপন্স ফাঁকা এলে fallback
    if (!text || text.trim().length === 0) {
      if (provider === "gemini") {
        console.warn("Gemini returned empty — falling back to OpenAI DALL·E");
        const res2 = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt,
            size,
          }),
        });
        const json2 = await res2.json();
        const b64 = json2?.data?.[0]?.b64_json;
        if (b64) return NextResponse.json({ dataUrl: `data:image/png;base64,${b64}` });
      }
      return NextResponse.json({ error: "Empty response from provider" }, { status: 500 });
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from provider", raw: text.slice(0, 200) }, { status: 500 });
    }

    if (!res.ok) {
      const msg = json?.error?.message || json?.message || "Upstream API error";
      return NextResponse.json({ error: msg }, { status: res.status || 500 });
    }

    // ✅ বেস৬৪ এক্সট্রাকশন (সব API টাইপের জন্য)
    const b64 =
      json?.data?.[0]?.b64_json ||
      json?.image?.base64 ||
      (json?.images && json?.images[0]?.base64) ||
      (json?.candidates && json?.candidates[0]?.content?.parts?.[0]?.inline_data?.data) ||
      (json?.artifacts && json?.artifacts[0]?.base64);

    if (!b64) {
      return NextResponse.json({ error: "No image data found", raw: json }, { status: 500 });
    }

    return NextResponse.json({ dataUrl: `data:image/png;base64,${b64}` });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Server Error" }, { status: 500 });
  }
}
