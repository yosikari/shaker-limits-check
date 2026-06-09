import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "OPENAI_API_KEY is not configured on Vercel"
      });
    }

    const { imageBase64 } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing imageBase64"
      });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
You are reading a vibration random profile table from an image.

Extract only rows with:
- ASD in G^2/Hz
- Frequency in Hz

The image may be Hebrew/English.
The printed table may have columns:
ASD(G²/Hz) and FREQ(Hz)
Sometimes ASD is on the left and FREQ on the right.

Return only numeric rows.
Do not invent missing rows.
Keep the original order from top to bottom.
Use dot decimal numbers.

Important examples:
ASD 0.1200 with FREQ 5.00 becomes { "asd": 0.1200, "freq": 5 }
ASD 4.9500 with FREQ 26.00 becomes { "asd": 4.95, "freq": 26 }

If there is handwriting near the frequency, ignore the handwriting unless it clearly replaces the printed value.
              `.trim()
            },
            {
              type: "input_image",
              image_url: imageBase64
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "vibration_profile_table",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              rows: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    asd: {
                      type: "number"
                    },
                    freq: {
                      type: "number"
                    }
                  },
                  required: ["asd", "freq"]
                }
              }
            },
            required: ["rows"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.output_text);

    return res.status(200).json({
      ok: true,
      rows: parsed.rows
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to extract table"
    });
  }
}
