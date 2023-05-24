using FluentMigrator;

// @formatter:off

namespace crppr.api.Database.Migration.Migration0 {
    [Migration(version: 3, description: "Create thing objects")]
    public class Base : BaseMigration {
        public override void Up() {
            CreateThingTable();
            CreateItemTable();
            CreateContainerTable();
            CreateThingDetailTable();
            
            Create.ForeignKey("fk_thing-container")
                .FromTable("thing").InSchema(SchemaName).ForeignColumn("container")
                .ToTable("container").InSchema(SchemaName).PrimaryColumn("guid")
                .OnDeleteOrUpdate(System.Data.Rule.Cascade);
        }

        public override void Down() {
            Delete.ForeignKey("fk_thing-container").OnTable("thing").InSchema(SchemaName);
            Delete.Table("thing_detail").InSchema(SchemaName);
            Delete.Table("item").InSchema(SchemaName);
            Delete.Table("container").InSchema(SchemaName);
            Delete.Table("thing").InSchema(SchemaName);
        }
        
        private void CreateThingTable() {
            Create.Table("thing")
                .InSchema(SchemaName)
                .WithColumn("guid").AsGuid().PrimaryKey().NotNullable()
                .WithColumn("container").AsGuid().Nullable()
                .WithColumn("state").AsString(10).NotNullable()
                .WithColumn("is_container").AsBoolean().NotNullable().WithDefaultValue(false)
                .WithColumn("date_created").AsDateTime().NotNullable().WithDefaultValue(SystemMethods.CurrentUTCDateTime)
                .WithColumn("date_updated").AsDateTime().NotNullable().WithDefaultValue(SystemMethods.CurrentUTCDateTime);
        }
        
        private void CreateContainerTable() {
            Create.Table("container")
                .InSchema(SchemaName)
                .WithColumn("guid").AsGuid().PrimaryKey().NotNullable()
                    .ForeignKey("fk_container-thing", SchemaName, "thing", "guid")
                .WithColumn("ident").AsString(8).Unique().NotNullable()
                .WithColumn("type").AsString();
        }
                
        private void CreateItemTable() {
            Create.Table("item")
                .InSchema(SchemaName)
                .WithColumn("guid").AsGuid().PrimaryKey().NotNullable()
                    .ForeignKey("fk_item-thing", SchemaName, "thing", "guid")
                    .OnDeleteOrUpdate(System.Data.Rule.Cascade);
        }
        
        private void CreateThingDetailTable() {
            Create.Table("thing_detail")
                .InSchema(SchemaName)
                .WithColumn("id").AsInt64().PrimaryKey().Identity().NotNullable()
                .WithColumn("thing").AsGuid().NotNullable()
                    .ForeignKey("fk_thing_detail-thing", SchemaName, "thing", "guid")
                    .OnDeleteOrUpdate(System.Data.Rule.Cascade)
                .WithColumn("detail").AsInt16().NotNullable()
                    .ForeignKey("fk_thing_detail-detail", SchemaName, "detail", "id")
                .WithColumn("value").AsString(100);
            
            Create.Index("uix_thing_detail-thing-detail").OnTable("thing_detail").InSchema(SchemaName)
                .WithOptions().Unique()
                .OnColumn("thing").Ascending()
                .OnColumn("detail").Ascending();
            
            Create.Index("ix_thing_detail-value").OnTable("thing_detail").InSchema(SchemaName)
                .OnColumn("value").Ascending();
        }
    }
}
