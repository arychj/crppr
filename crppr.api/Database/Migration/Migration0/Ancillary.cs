using FluentMigrator;

// @formatter:off

namespace crppr.api.Database.Migration.Migration0 {
    [Migration(version: 1, description: "Create ancillary objects")]
    public class Ancillary : BaseMigration {
        public override void Up() {
            CreateDetailTable();
        }

        public override void Down() {
            Delete.Table("detail").InSchema(SchemaName);
        }
        
        private void CreateDetailTable() {
            Create.Table("detail")
                .InSchema(SchemaName)
                .WithColumn("id").AsInt16().PrimaryKey().Identity().NotNullable()
                .WithColumn("name").AsString(25).Unique().NotNullable()
                .WithColumn("validator").AsString(100)
                .WithColumn("description").AsString(100);
            
            Insert.IntoTable("detail")
                .InSchema(SchemaName)
                .Row(new { id = 0, name = "String", validator = @"^(.{1,100})$", description = "" })
                .Row(new { id = 1, name = "Int", validator = @"^\d+$", description = "" })
                .Row(new { id = 2, name = "Date", validator = @"^\d{4}-\d{2}-\d{2}$", description = "" });
        }
    }
}
