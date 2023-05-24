using crppr.api.Database.Configuration.Extension;
using crppr.api.test.Common;
using Microsoft.AspNetCore.Builder;
using NUnit.Framework;

namespace crppr.api.test {
    [SetUpFixture]
    public class GlobalFixture {
        [OneTimeSetUp]
        public void GlobalSetup() {
            Env.Load();
            Env.ConfigureUnitForTests();
            
            WebApplicationBuilder builder = WebApplication.CreateBuilder();
            WebApplication app = builder.Build();
            app.AddCustomDapperTypes().MigrateDatabase();
        }

        [OneTimeTearDown]
        public void GlobalTeardown() {
            WebApplicationBuilder builder = WebApplication.CreateBuilder();
            WebApplication app = builder.Build();
            app.ResetDatabase();
        }
    }
}
