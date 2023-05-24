using crppr.api.Database.Configuration.Dapper.TypeHandler;
using Dapper;

namespace crppr.api.Database.Configuration.Extension {
    public static class CustomDapperTypes {
        public static IHost AddCustomDapperTypes(this IHost host) {
            SqlMapper.AddTypeHandler(new ContainerTypeHandler());
            return host;
        }
    }
}
