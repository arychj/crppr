using FluentMigrator.Runner.VersionTableInfo;

namespace crppr.api.Database.Configuration.Fluent {
    [VersionTableMetaData]
    sealed public class VersionInfoConfiguration : IVersionTableMetaData {
        public string SchemaName => Settings.GetParameter("database", "schema");

        public string TableName => "VersionInfo";

        public string ColumnName => "Version";

        public string UniqueIndexName => "UC_Version";

        public string AppliedOnColumnName => "AppliedOn";

        public string DescriptionColumnName => "Description";

        public bool OwnsSchema => true;

        public object ApplicationContext { get; set; }
    }
}
