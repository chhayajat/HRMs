import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [{ role: "user", content: "Hello, how are you?" }],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 1024,
  })

  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '')
  }
}

main().catch(console.error)
