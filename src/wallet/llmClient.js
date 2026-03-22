function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM response did not contain a JSON object.");
  }

  return text.slice(start, end + 1);
}

export async function requestTipDecision({ endpoint, apiKey, model, systemPrompt, userPayload }) {
  if (!endpoint) {
    throw new Error("Missing LLM endpoint in settings.");
  }

  const isResponsesApi = endpoint.includes("/responses");

  const requestBody = isResponsesApi
    ? {
        model: model || "gpt-5-nano",
        input: [
          {
            role: "system",
            content:
              systemPrompt ||
              "You are SmartTip agent. Return strict JSON only with keys: shouldTip (boolean), amount (number), token (STT|USDt|BTC|XAUt), reason (string), confidence (0..1), creatorRisk (0..1)."
          },
          {
            role: "user",
            content: JSON.stringify(userPayload)
          }
        ],
        store: true
      }
    : {
        model: model || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              systemPrompt ||
              "You are SmartTip agent. Return strict JSON only with keys: shouldTip (boolean), amount (number), token (STT|USDt|BTC|XAUt), reason (string), confidence (0..1), creatorRisk (0..1)."
          },
          {
            role: "user",
            content: JSON.stringify(userPayload)
          }
        ]
      };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`LLM HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawContent =
    data?.output?.[0]?.content?.[0]?.text ||
    data?.choices?.[0]?.message?.content ||
    data?.output_text ||
    JSON.stringify(data);

  const parsed = JSON.parse(extractFirstJsonObject(String(rawContent)));
  return parsed;
}
