using System.Text.Json;

namespace LeoDevTracker.API.Helpers
{
    public static class ExtrasHelper
    {
        public static bool GetBool(string? json, string key)
        {
            if (string.IsNullOrWhiteSpace(json)) return false;
            try
            {
                var doc = JsonDocument.Parse(json);
                return doc.RootElement.TryGetProperty(key, out var el) && el.GetBoolean();
            }
            catch { return false; }
        }

        public static int GetInt(string? json, string key)
        {
            if (string.IsNullOrWhiteSpace(json)) return 0;
            try
            {
                var doc = JsonDocument.Parse(json);
                return doc.RootElement.TryGetProperty(key, out var el) ? el.GetInt32() : 0;
            }
            catch { return 0; }
        }

        public static string? GetString(string? json, string key)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                var doc = JsonDocument.Parse(json);
                return doc.RootElement.TryGetProperty(key, out var el) ? el.GetString() : null;
            }
            catch { return null; }
        }

        public static double GetDouble(string? json, string key)
        {
            if (string.IsNullOrWhiteSpace(json)) return 0;
            try
            {
                var doc = JsonDocument.Parse(json);
                return doc.RootElement.TryGetProperty(key, out var el) ? el.GetDouble() : 0;
            }
            catch { return 0; }
        }
    }
}
