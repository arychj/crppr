using System.Data.Common;
using Dapper;
using Medo;

namespace crppr.api.Database.Entity {
    public class Thing {
        public Guid Guid { get; set; } = Uuid7.NewUuid7().ToGuid();
        public Container Container { get; set; }
        public State State { get; set; } = State.Active;
        public bool IsContainer { get; set; }
        public DateTime DateCreated { get; set; } = DateTime.Now;
        public DateTime DateUpdated { get; set; } = DateTime.Now;

        protected void SetThing(Thing thing) {
            Guid = thing.Guid;
            Container = thing.Container;
            State = thing.State;
            IsContainer = thing.IsContainer;
            DateCreated = thing.DateCreated;
            DateUpdated = thing.DateUpdated;
        }
        
        public async Task Delete() {
            State = State.Deleted;
            await Persist();
        }
        
        public async Task Persist() {
            DateUpdated = DateTime.Now;
            
            await using (DbConnection connection = Settings.DatabaseConnection) {
                await connection.ExecuteAsync(
                    @"insert into thing (guid, container, state, is_container, date_updated, date_created) values (@guid, @container, @state, @is_container, @created, @updated)" +
                    @" on conflict(guid) do update set container=@container, state=@state, is_container=@is_container, date_updated=@updated",
                    new {
                        guid = Guid,
                        container = Container,
                        state = State,
                        is_container = IsContainer,
                        created = DateCreated,
                        updated = DateUpdated
                    }
                );
            }
        }
        
        public static async Task<Thing> Retrieve(Guid guid) {
            await using (DbConnection connection = Settings.DatabaseConnection) {
                IEnumerable<Thing> things = await connection.QueryAsync<Thing>(
                    @"select * from thing where guid=@guid", 
                    new {
                        guid
                    }
                );

                return things.FirstOrDefault();
            }
        }

        public static async Task<IEnumerable<Thing>> GetRoot() {
            await using (DbConnection connection = Settings.DatabaseConnection) {
                return await connection.QueryAsync<Thing>(
                    @"select * from thing where parent is null"
                );
            }
        }
        
        public static implicit operator string(Thing t) => t.Guid.ToString();
    }
}
