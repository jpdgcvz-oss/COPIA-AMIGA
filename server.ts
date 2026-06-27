import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit to handle base64 image uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Initialize GoogleGenAI client (safe server-side initialization)
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set. API calls will fail.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Endpoint to process school content
app.post("/api/process-content", async (req, res) => {
  try {
    const { image, mimeType, text, chunkPreference } = req.body;

    if (!image && !text) {
      return res.status(400).json({ error: "Por favor, envie uma foto ou digite o texto do conteúdo." });
    }

    const ai = getGeminiClient();

    let chunkInstruction = "Divida o texto em partes pequenas de até 1 frase curta por parte.";
    if (chunkPreference === "ultra-short") {
      chunkInstruction = "Divida o texto em pedaços extremamente curtos de 3 a 5 palavras por parte, ideal para crianças com baixíssima tolerância à cópia.";
    } else if (chunkPreference === "standard") {
      chunkInstruction = "Divida o texto em pedaços curtos de 1 frase curta por parte (média de 6 a 10 palavras).";
    } else if (chunkPreference === "medium") {
      chunkInstruction = "Divida o texto em trechos de até 2 frases curtas por parte (média de 12 a 18 palavras).";
    } else if (chunkPreference === "paragraph") {
      chunkInstruction = "Divida o texto em parágrafos completos (média de 3 a 5 frases por parte), ideal para crianças que já conseguem focar por um período um pouco maior e copiar trechos maiores de uma vez.";
    }

    const systemInstruction = `Você é um psicopedagogo especializado em TEA (Transtorno do Espectro Autista) e TDAH (Transtorno do Déficit de Atenção com Hiperatividade). 
Sua missão é receber um conteúdo escolar (seja em imagem ou texto) e adaptá-lo para que uma criança com alta resistência à cópia consiga ler e copiar no caderno dela, passo a passo, sem se frustrar ou se cansar.

Siga rigorosamente estas diretrizes de adaptação:
1. Extraia e normalize o texto do conteúdo escolar (remover trechos irrelevantes, focar no conteúdo principal que a criança realmente precisa copiar).
2. ${chunkInstruction}
3. O significado pedagógico e o conteúdo essencial de aprendizado NÃO devem ser perdidos, apenas divididos em doses acolhedoras.
4. Crie um título curto e divertido com emojis para a lição.
5. Crie uma introdução extremamente animadora e calorosa ('adaptedExplanation') direcionada diretamente à criança. Diga a ela o que vão fazer e dê um incentivo inicial amoroso e empolgante.
6. Para cada pedaço ('chunk'), crie um elogio / reforço positivo personalizado ('praise') em português. Esse elogio deve celebrar calorosamente o esforço e a conclusão daquela cópia específica. Use analogias lúdicas, mensagens de super-heróis, astronautas ou animais fofos, e use emojis divertidos. Evite repetições.

Seu retorno deve ser exclusivamente um objeto JSON correspondente a este esquema:
{
  "title": "Título curto com emojis",
  "adaptedExplanation": "Mensagem acolhedora de introdução para a criança.",
  "chunks": [
    {
      "id": 1,
      "text": "Conteúdo exato a ser copiado neste pedaço.",
      "praise": "Reforço positivo exclusivo para este pedaço."
    }
  ]
}`;

    let contents: any[] = [];

    if (image) {
      // Remove data URI prefix if present (e.g. "data:image/jpeg;base64,")
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      contents.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: base64Data,
        },
      });
      contents.push({
        text: `Por favor, analise esta imagem de conteúdo escolar e extraia/adapte seu conteúdo. Use a seguinte preferência de segmentação: ${chunkInstruction}`,
      });
    } else {
      contents.push({
        text: `Por favor, analise e adapte o seguinte texto escolar: "${text}". Use a seguinte preferência de segmentação: ${chunkInstruction}`,
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "adaptedExplanation", "chunks"],
          properties: {
            title: {
              type: Type.STRING,
              description: "Um título curto, lúdico e convidativo para a lição escolar.",
            },
            adaptedExplanation: {
              type: Type.STRING,
              description: "Uma introdução carinhosa de 1 a 2 frases para acalmar e motivar a criança.",
            },
            chunks: {
              type: Type.ARRAY,
              description: "A lista de pedaços de texto que a criança irá copiar um de cada vez.",
              items: {
                type: Type.OBJECT,
                required: ["id", "text", "praise"],
                properties: {
                  id: {
                    type: Type.INTEGER,
                    description: "Número sequencial da parte (iniciando em 1).",
                  },
                  text: {
                    type: Type.STRING,
                    description: "O texto adaptado e segmentado pronto para cópia.",
                  },
                  praise: {
                    type: Type.STRING,
                    description: "Um reforço positivo exclusivo, alegre e criativo para celebrar a cópia deste trecho.",
                  },
                },
              },
            },
          },
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Não foi possível gerar a resposta do Gemini.");
    }

    const parsedResult = JSON.parse(resultText.trim());
    return res.json(parsedResult);

  } catch (error: any) {
    console.error("Erro ao processar conteúdo escolar:", error);
    return res.status(500).json({
      error: "Ocorreu um erro ao processar o conteúdo. Certifique-se de que a imagem é legível ou tente novamente.",
      details: error.message,
    });
  }
});

// Configure Vite or Static Files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static files from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
