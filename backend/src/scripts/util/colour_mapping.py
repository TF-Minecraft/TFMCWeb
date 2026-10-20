from ..loader.provinces import load_provinces
from ..loader.counties import load_counties
from ..loader.duchies import load_duchies
from ..loader.kingdoms import load_kingdoms
from ..loader.nations import load_nations
from ..loader.empires import load_empires
from ..loader.guilds import load_guilds
from ..util.dirs import validate_map, input_file
from ..loader.province_metadata import load_province_metadata
import json

SKIP_TERRAINS = {
    "water",
    "sea",
}


LEADER_MIN_TRADE_WEIGHT = 0.20  # 🔧 tune here


def get_dominant_guild(trade: dict):
    best_guild = None
    best_value = 0.0
    for guild, data in trade.items():
        value = data.get("trade", 0)
        if value > best_value:
            best_value = value
            best_guild = guild
    return best_guild, best_value


def get_trade_ratio(trade: dict):
    total = sum(d.get("trade", 0) for d in trade.values())
    if total <= 0:
        return 0.0
    _, best = get_dominant_guild(trade)
    return best / total


def leader_minimum_blend(raw: dict, leader_min: float) -> dict:
    """
    Leader gets at least leader_min weight, but still participates
    proportionally in the remaining blend.
    """
    leader = max(raw, key=raw.get)
    scale = 1.0 - leader_min

    weights = {g: v * scale for g, v in raw.items()}
    weights[leader] += leader_min

    return weights


def mix_trade_color(trade: dict, guilds: dict) -> tuple[int, int, int] | None:
    """
    Weighted RGB mix of all guild shares in this province,
    with a guaranteed minimum visual weight for the dominant guild.
    """
    raw = {}
    total = 0.0

    for gid, data in trade.items():
        if gid not in guilds:
            continue
        v = float(data.get("trade", 0) or 0)
        if v <= 0:
            continue
        raw[gid] = v
        total += v

    if total <= 0:
        return None

    # Normalize raw shares
    for gid in raw:
        raw[gid] /= total

    # Apply leader-min dominance
    weights = leader_minimum_blend(raw, LEADER_MIN_TRADE_WEIGHT)

    r = g = b = 0.0
    used = False

    for gid, w in weights.items():
        if w <= 0:
            continue
        cr, cg, cb = guilds[gid]["rgb"]
        r += cr * w
        g += cg * w
        b += cb * w
        used = True

    if not used:
        return None

    return (int(r + 0.5), int(g + 0.5), int(b + 0.5))


def build_color_mapping(map_name: str, mode: str):
    """
    Returns:
        province_to_color: dict[(prov_rgb)] -> (target_rgb)  (always)
    Side-channels (only for trade mode):
        build_color_mapping.trade_strength: dict[(prov_rgb)] -> float [0..1] dominance ratio
        build_color_mapping.trade_mixed:    dict[(prov_rgb)] -> (r,g,b) weighted mix color
    """
    validate_map(map_name)

    provinces = load_provinces(map_name)
    counties = load_counties(map_name)
    duchies = load_duchies(map_name)
    kingdoms = load_kingdoms(map_name)
    nations = load_nations(map_name)
    empires = load_empires(map_name)

    province_to_color = {}

    # Clear any stale side-channels from previous calls
    if hasattr(build_color_mapping, "trade_strength"):
        delattr(build_color_mapping, "trade_strength")
    if hasattr(build_color_mapping, "trade_mixed"):
        delattr(build_color_mapping, "trade_mixed")
    if hasattr(build_color_mapping, "occupation_provinces"):
        delattr(build_color_mapping, "occupation_provinces")
    build_color_mapping.occupation_provinces = set()

    if mode == "empire":
        kingdom_to_empire = {
            kingdom: tuple(map(int, empires[e]["rgb"].split(",")))
            for e in empires
            for kingdom in empires[e].get("titles", [])
        }

        for kingdom, data in kingdoms.items():
            empire_color = kingdom_to_empire.get(kingdom, (0, 0, 0))
            for duchy in data.get("titles", []):
                if duchy in duchies:
                    for county in duchies[duchy].get("titles", []):
                        if county in counties:
                            for province_id in counties[county].get("provinces", []):
                                for rgb, pid in provinces.items():
                                    if pid == province_id:
                                        province_to_color[rgb] = empire_color

    elif mode == "kingdom":
        duchy_to_kingdom = {
            duchy: tuple(map(int, kingdoms[k]["rgb"].split(",")))
            for k in kingdoms
            for duchy in kingdoms[k].get("titles", [])
        }

        for duchy, data in duchies.items():
            kingdom_color = duchy_to_kingdom.get(duchy, (0, 0, 0))
            for county in data.get("titles", []):
                if county in counties:
                    for province_id in counties[county].get("provinces", []):
                        for rgb, pid in provinces.items():
                            if pid == province_id:
                                province_to_color[rgb] = kingdom_color

    elif mode == "duchy":
        county_to_duchy = {
            county: tuple(map(int, duchies[d]["rgb"].split(",")))
            for d in duchies
            for county in duchies[d].get("titles", [])
        }

        for county, data in counties.items():
            if county not in county_to_duchy:
                continue
            duchy_color = county_to_duchy[county]
            for province_id in data.get("provinces", []):
                for rgb, pid in provinces.items():
                    if pid == province_id:
                        province_to_color[rgb] = duchy_color

    elif mode == "county":
        for county, data in counties.items():
            county_color = tuple(map(int, data["rgb"].split(",")))
            for province_id in data.get("provinces", []):
                for rgb, pid in provinces.items():
                    if pid == province_id:
                        province_to_color[rgb] = county_color

    elif mode == "nation":
        for nation, data in nations.items():
            nation_color = tuple(map(int, data["rgb"].split(",")))
            for province_id in data.get("provinces", []):
                for rgb, pid in provinces.items():
                    if pid == province_id:
                        province_to_color[rgb] = nation_color

        build_color_mapping.occupation_provinces = apply_occupation_remap(
            province_to_color,
            provinces,
            nations,
            _load_province_data(map_name),
        )

    elif mode == "coalition":
        # Imported here: coalitiongen draws through mapgen, which imports this.
        from ..mapgen.coalitiongen import color_mapping as coalition_color_mapping

        province_to_color.update(coalition_color_mapping(map_name, provinces))

    elif mode == "trade":
        guilds = load_guilds(map_name)
        province_meta = load_province_metadata(map_name)

        with open(input_file(map_name, "province_data.json"), "r") as f:
            province_data = json.load(f)

        province_by_id = {p["id"]: p for p in province_data}

        # Side-channels
        build_color_mapping.trade_strength = {}
        build_color_mapping.trade_mixed = {}

        for prov_rgb, pid in provinces.items():
            meta = province_meta.get(pid, {})
            terrain = (meta.get("terrain") or "").lower()
            if terrain in SKIP_TERRAINS:
                continue

            pdata = province_by_id.get(pid)
            if not pdata:
                continue

            trade = pdata.get("trade")
            if not trade:
                continue

            dominant, _ = get_dominant_guild(trade)
            if not dominant or dominant not in guilds:
                continue

            # Base identity color (still dominant guild)
            base_color = guilds[dominant]["rgb"]
            province_to_color[prov_rgb] = base_color

            # Dominance ratio (raw, not visually biased)
            build_color_mapping.trade_strength[prov_rgb] = get_trade_ratio(trade)

            # Visually biased mixed color
            mixed = mix_trade_color(trade, guilds)
            build_color_mapping.trade_mixed[prov_rgb] = mixed or base_color

    return province_to_color


def _load_province_data(map_name: str) -> list:
    path = input_file(map_name, "province_data.json")
    try:
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError:
        return []
    return data if isinstance(data, list) else []


def apply_occupation_remap(
    province_to_color: dict,
    provinces: dict,
    nations: dict,
    province_data: list | None,
) -> set:
    """Paint occupied provinces as the occupier nation. Returns remapped province RGBs."""
    occupied = set()
    if not province_data or not nations:
        return occupied

    rgb_by_id = {pid: rgb for rgb, pid in provinces.items()}
    for pdata in province_data:
        if not isinstance(pdata, dict):
            continue
        occupier_id = pdata.get("occupied_by")
        if not occupier_id or occupier_id not in nations:
            continue
        occupier = nations[occupier_id]
        if not isinstance(occupier, dict) or "rgb" not in occupier:
            continue
        prov_rgb = rgb_by_id.get(pdata.get("id"))
        if prov_rgb is None:
            continue
        held = occupier.get("provinces") or []
        if isinstance(held, list) and pdata.get("id") in held:
            continue
        occupier_color = tuple(int(part) for part in occupier["rgb"].split(","))
        province_to_color[prov_rgb] = occupier_color
        occupied.add(prov_rgb)
    return occupied


def get_overlord_rgb(nation: str, nations: dict):
    overlord = nations.get(nation, {}).get("overlord")
    if overlord and overlord in nations:
        return tuple(map(int, nations[overlord]["rgb"].split(",")))
    return None


def get_color_overrides(map_name: str, mode: str):
    validate_map(map_name)

    overrides = {}
    if mode != "nation":
        return overrides

    nations = load_nations(map_name)

    for nation, data in nations.items():
        nation_color = tuple(map(int, data["rgb"].split(",")))
        overlord_rgb = get_overlord_rgb(nation, nations)
        if overlord_rgb:
            overrides[nation_color] = overlord_rgb

    return overrides
