using System.Data;
using crppr.api.Database.Entity;
using Dapper;

namespace crppr.api.Database.Configuration.Dapper.TypeHandler {
    public class ContainerTypeHandler : SqlMapper.TypeHandler<Container> {
        public override void SetValue(IDbDataParameter parameter, Container value) {
            parameter.Value = value.Guid;
        }

        public override Container Parse(object value) {
            return new Container() { Guid = (Guid)value };
        }
    }
}
