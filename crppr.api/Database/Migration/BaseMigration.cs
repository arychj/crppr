namespace crppr.api.Database.Migration {
    abstract public class BaseMigration : FluentMigrator.Migration {
        protected static string SchemaName => api.Settings.GetParameter("database", "schema");
    }
}
