using System.Threading.Tasks;
using crppr.api.Database.Entity;
using crppr.api.test.Common;
using NUnit.Framework;

namespace crppr.api.test {
    public class ThingTests {
        [Test]
        [Rollback]
        public async Task Relationship() {
            Container parent = new() { Ident = "test", Type = "Test"};
            Thing child = new() { Container = parent };

            await parent.Persist();
            await child.Persist();

            Thing thing = await Thing.Retrieve(child.Guid);
            
            Assert.AreEqual(parent.Guid, thing.Container.Guid);
        }
    }
}
