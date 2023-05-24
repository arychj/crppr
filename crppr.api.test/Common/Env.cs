using System;
using System.IO;

namespace crppr.api.test.Common {
    public static class Env {
        public static void Load() {
            string path = Path.Combine(TestValue.ProjectPath, ".env");
            Load(path);
        }
        
        public static void Load(string file) {
            if (File.Exists(file)) {
                foreach (string line in File.ReadAllLines(file)) {
                    string[] parts = line.Split(
                        '=',
                        StringSplitOptions.RemoveEmptyEntries
                    );

                    if (parts.Length == 2) {
                        Environment.SetEnvironmentVariable(parts[0], parts[1]);
                    }
                }
            } else {
                throw new FileNotFoundException($".env file '{file}' does not exist");
            }
        }

        public static void ConfigureUnitForTests() {
            Environment.SetEnvironmentVariable(
                "CRPPR_DATABASE_SCHEMA", 
                $"{Settings.GetParameter("database", "schema")}_unittests_{DateTime.Now.ToFileTime()}");
        }
    }
}
