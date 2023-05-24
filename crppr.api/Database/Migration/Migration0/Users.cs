using FluentMigrator;

// @formatter:off

namespace crppr.api.Database.Migration.Migration0 {
    [Migration(version: 2, description: "Create user objects")]
    public class Users : BaseMigration {
        public override void Up() {
            CreateUserTable();
        }

        public override void Down() {
            Delete.Table("user").InSchema(SchemaName);
        }
        
        private void CreateUserTable() {
            Create.Table("user")
                .InSchema(SchemaName)
                .WithColumn("id").AsInt32().Identity().PrimaryKey().NotNullable()
                .WithColumn("email").AsString(255).Unique().NotNullable()
                .WithColumn("given_name").AsString(50).Unique().NotNullable()
                .WithColumn("surname").AsString(50).Unique().NotNullable()
                .WithColumn("is_active").AsBoolean().NotNullable().WithDefaultValue(true)
                .WithColumn("date_created").AsDateTime().NotNullable().WithDefaultValue(SystemMethods.CurrentUTCDateTime);
        }
    }
}
