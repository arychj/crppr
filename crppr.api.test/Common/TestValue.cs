using System;
using System.IO;
using System.Reflection;

namespace crppr.api.test.Common {
    public static class TestValue {
        public static string ProjectPath => GetProjectPath(Assembly.GetCallingAssembly());

        public static string GetProjectPath(Assembly relativeTo) {
            string path = Path.GetDirectoryName(relativeTo.Location) ?? throw new InvalidOperationException();
            return Path.Combine(path, "..", "..", "..", "..");
        }
    }
}
