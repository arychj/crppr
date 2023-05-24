namespace crppr.api.Database.Entity {
    public interface IThing {
        Guid Guid { get; set; }
        void Hydrate();
    }
}
