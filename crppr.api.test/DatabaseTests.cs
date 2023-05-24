using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using crppr.api.Database.Entity;
using crppr.api.test.Common;
using Dapper;
using NUnit.Framework;

namespace crppr.api.test {
    public class DatabaseTests {
        [Test]
        public void ConnectionString() {
            Assert.AreEqual(
                "Server=localhost;Port=5432;Database=postgres;SearchPath=crppr;User Id=postgres;Password=postgres;",
                Settings.ConnectionString
            );
        }

        [Test]
        public void DatabaseConnection() {
            using (DbConnection connection = Settings.DatabaseConnection) {
                List<dynamic>? rows = connection.Query(
                        "select 1 as \"Test\""
                    )
                    .AsList();
                
                Assert.AreEqual(1, (int)rows[0].Test);
            }
        }
        
        [Test]
        [Rollback]
        public async Task TestPersistence() {
            Thing thing1 = new();
            await thing1.Persist();

            Thing thing2 = await Thing.Retrieve(thing1.Guid);

            Assert.AreEqual(thing1.Guid, thing2.Guid);
        }
        
        [Test]
        [Rollback]
        public async Task TestRollbacks() {
            const int count = 3;

            for (int i = 0; i < count; i++) {
                await (new Thing()).Persist();
            }

            IEnumerable<Thing> things = await Thing.GetRoot();
            Assert.AreEqual(count, things.Count());
        }
    }
}
