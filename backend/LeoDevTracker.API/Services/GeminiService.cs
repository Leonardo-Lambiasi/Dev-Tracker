using Google.GenAI;
using Google.GenAI.Types;

namespace LeoDevTracker.API.Services
{
    public class GeminiService : IAiService
    {
        private readonly string _apiKey;

        public GeminiService(IConfiguration config)
        {
            _apiKey = config["GeminiApi:ApiKey"]
                ?? throw new InvalidOperationException("GeminiApi:ApiKey não configurada.");
        }

        public async Task<string> Enviar(string prompt, string modelo, int maxTokens = 1024, bool jsonMode = false, int thinkingBudget = -1)
        {
            try
            {
                var client = new Client(apiKey: _apiKey);

                var budget = thinkingBudget >= 0 ? thinkingBudget : (modelo == AiModelos.Flash ? 0 : 8000);
                var config = new GenerateContentConfig
                {
                    MaxOutputTokens = maxTokens,
                    Temperature = 0.7f,
                    ThinkingConfig = new ThinkingConfig { ThinkingBudget = budget },
                };
                if (jsonMode) config.ResponseMimeType = "application/json";

                var response = await client.Models.GenerateContentAsync(
                    model: modelo,
                    contents: prompt,
                    config: config
                );

                return response.Text
                    ?? throw new InvalidOperationException("Gemini retornou resposta vazia.");
            }
            catch (Exception ex) when (ex.Message.Contains("429") || ex.Message.Contains("quota") || ex.Message.Contains("RESOURCE_EXHAUSTED"))
            {
                throw new InvalidOperationException("Limite da API atingido. Tente novamente mais tarde.");
            }
        }
    }
}
