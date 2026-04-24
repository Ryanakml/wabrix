const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

async function testTranscription() {
  // 1. Setup API Key (Ganti dengan API Key dari AI Studio)
  const genAI = new GoogleGenerativeAI(
    "AIzaSyDOrS6HHd4LIfu3qLdyXT6rQ7LF-oABOyc",
  );

  // 2. Gunakan model yang VALID (Ganti gemini-2.5-flash ke 1.5-flash)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    // 3. Baca file audio lokal (pastikan ada file .ogg di folder yang sama)
    const audioBuffer = fs.readFileSync("test.ogg");
    const base64Audio = audioBuffer.toString("base64");

    console.log("Sedang memproses transkripsi...");

    // 4. Kirim ke Gemini Multimodal
    const result = await model.generateContent([
      "Transcribe the following audio accurately. Just output the text.",
      {
        inlineData: {
          data: base64Audio,
          mimeType: "audio/ogg", // Penting: sesuaikan dengan format WA
        },
      },
    ]);

    const response = await result.response;
    console.log("--- HASIL TRANSKRIP ---");
    console.log(response.text());
    console.log("-----------------------");
  } catch (error) {
    console.error("Terjadi Error:", error.message);
  }
}

testTranscription();
