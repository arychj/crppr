using System.Data.Common;
using System.Transactions;
using Dapper;

namespace crppr.api.Database.Entity {
    public class Container : Thing {
        public string Ident { get; set; }
        public string Type { get; set; }
        
        new public static async Task<Container> Retrieve(Guid guid) {
            await using (DbConnection connection = Settings.DatabaseConnection) {
                IEnumerable<Container> container = await connection.QueryAsync<Thing, Container, Container>(
                    @"select * from container c left join thing t on c.guid = t.guid where guid = @guid", 
                    (thing, container) => {
                        container.SetThing(thing);
                        return container;
                    },
                    new {
                        guid
                    }
                );

                return container.FirstOrDefault();
            }
        }

        public async Task<IEnumerable<Thing>> Contents() {
            await using (DbConnection connection = Settings.DatabaseConnection) {
                IEnumerable<Thing> contents = await connection.QueryAsync<Thing>(
                    @"select * from thing where parent = @parent", 
                    new {
                        parent = Guid
                    }
                );

                return contents;
            }
        }

        new public async Task Persist() {
            //TODO : transaction
            await base.Persist();
            await using (DbConnection connection = Settings.DatabaseConnection) {
                IEnumerable<Thing> contents = await connection.QueryAsync<Thing>(
                    @"insert into container (guid, ident, type) values (@guid, @ident, @type)" +
                    @" on conflict(guid) do update set ident = @ident, type = @type",
                    new {
                        guid = Guid,
                        ident = Ident,
                        type = Type
                    }
                );
            }
        }
    }
}
