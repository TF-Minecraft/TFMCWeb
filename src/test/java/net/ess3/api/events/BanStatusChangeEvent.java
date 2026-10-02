package net.ess3.api.events;

import org.bukkit.event.Event;
import org.bukkit.event.HandlerList;

/** Test-only shape for the optional Essentials reflective integration. */
public class BanStatusChangeEvent extends Event {
    public Object value, banned, affected, entry, banEntry, controller, name;
    public Object getValue(){return value;}
    public Object isBanned(){return banned;}
    public Object getAffected(){return affected;}
    public Object getEntry(){return entry;}
    public Object getBanEntry(){return banEntry;}
    public Object getController(){return controller;}
    public Object getName(){return name;}
    @Override public HandlerList getHandlers(){return new HandlerList();}
}
