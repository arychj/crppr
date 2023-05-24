using System.Data.Common;
using Npgsql;

namespace crppr.api {
    public static class Settings {
        public const string PREFIX = "CRPPR";
        public const string SEPARATOR = "_";
        
        public static string ConnectionString => GetConnectionString();
        public static DbConnection DatabaseConnection => new NpgsqlConnection(ConnectionString);
        
        public static string GetParameter(params string[] keys) {
            string address = string.Join(SEPARATOR, keys).ToUpper();
            return Environment.GetEnvironmentVariable($"{PREFIX}{SEPARATOR}{address}");
        }

        private static string GetConnectionString() {
            string host = GetParameter("database", "host");
            string port = GetParameter("database", "port");
            string database = GetParameter("database", "database");
            string schema = GetParameter("database", "schema");
            string username = GetParameter("database", "username");
            string password = GetParameter("database", "password");

            return $"Server={host};Port={port};Database={database};SearchPath={schema};User Id={username};Password={password};";
        }
    }
}
