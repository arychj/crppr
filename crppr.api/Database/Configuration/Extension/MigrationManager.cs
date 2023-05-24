using System.Reflection;
using crppr.api.Database.Configuration.Fluent;
using FluentMigrator.Runner;
using FluentMigrator.Runner.VersionTableInfo;

namespace crppr.api.Database.Configuration.Extension {
    public static class MigrationManager {
        public static IHost MigrateDatabase(this IHost host) {
            using (ServiceProvider serviceProvider = CreateServices())
            using (IServiceScope scope = serviceProvider.CreateScope()) {
                IMigrationRunner runner = scope.ServiceProvider.GetRequiredService<IMigrationRunner>();
                runner.MigrateUp();
            }

            return host;
        }

        public static IHost ResetDatabase(this IHost host) {
            using (ServiceProvider serviceProvider = CreateServices())
            using (IServiceScope scope = serviceProvider.CreateScope()) {
                IMigrationRunner runner = scope.ServiceProvider.GetRequiredService<IMigrationRunner>();
                runner.Rollback(int.MaxValue);
            }

            return host;
        }

        private static ServiceProvider CreateServices() {
            return new ServiceCollection()
                .AddFluentMigratorCore()
                .ConfigureRunner(
                    rb => rb
                        .AddPostgres()
                        .WithGlobalConnectionString(Settings.ConnectionString)
                        .ScanIn(Assembly.GetExecutingAssembly())
                        .For.Migrations()
                )
                .AddScoped(typeof(IVersionTableMetaData), typeof(VersionInfoConfiguration))
                .AddLogging(lb => lb.AddFluentMigratorConsole())
                .BuildServiceProvider(false);
        }
    }
}
