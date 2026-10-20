"""The coalition redraw after an upload never raises out of its BackgroundTask."""

import asyncio
from unittest import mock

from src.api import data_routes


def test_a_failed_redraw_is_logged_not_raised():
    with mock.patch.object(data_routes, "run_coalition_mode", side_effect=MemoryError("boom")), mock.patch.object(
        data_routes.logger, "warning"
    ) as warning:
        asyncio.run(data_routes._refresh_coalition_map("main"))
    warning.assert_called_once()


def test_a_redraw_warms_the_tiles():
    with mock.patch.object(data_routes, "run_coalition_mode") as run, mock.patch(
        "src.api.tile_warm.warm_map_tiles"
    ) as warm:
        asyncio.run(data_routes._refresh_coalition_map("main"))
    run.assert_called_once_with("main")
    warm.assert_called_once_with("main")
