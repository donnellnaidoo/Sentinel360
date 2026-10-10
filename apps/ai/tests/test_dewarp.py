import numpy as np

from app.pipeline.capture import Frame
from app.pipeline.dewarp import (
    SINGLE_VIEW_NAME,
    ViewSplitter,
    compose_grid,
    create_perspective_map,
    view_point_to_direction,
)


def _panorama() -> np.ndarray:
    # Each quarter of the panorama's longitude gets its own colour so we can
    # tell which direction a view is looking. Front (yaw 0) is the centre of
    # an equirectangular image; Rear wraps around the left/right edges.
    pano = np.zeros((480, 960, 3), dtype=np.uint8)
    pano[:, 0:120] = (255, 0, 0)  # rear (left edge)
    pano[:, 120:360] = (0, 0, 255)  # left
    pano[:, 360:600] = (0, 255, 0)  # front
    pano[:, 600:840] = (255, 255, 0)  # right
    pano[:, 840:960] = (255, 0, 0)  # rear (right edge)
    return pano


def test_panorama_splits_into_four_views_facing_the_right_way():
    views = ViewSplitter(fov=100, out_width=480, out_height=360).split(
        Frame(image=_panorama(), frame_index=0, timestamp=0.0, panoramic=True)
    )

    assert list(views) == ["Front", "Right", "Rear", "Left"]
    for image in views.values():
        assert image.shape == (360, 480, 3)

    centre = (180, 240)
    assert tuple(views["Front"][centre]) == (0, 255, 0)
    assert tuple(views["Right"][centre]) == (255, 255, 0)
    assert tuple(views["Rear"][centre]) == (255, 0, 0)
    assert tuple(views["Left"][centre]) == (0, 0, 255)


def test_non_panoramic_frame_passes_through():
    image = np.zeros((480, 640, 3), dtype=np.uint8)
    views = ViewSplitter().split(Frame(image=image, frame_index=0, timestamp=0.0))
    assert list(views) == [SINGLE_VIEW_NAME]
    assert views[SINGLE_VIEW_NAME] is image


def test_compose_grid_lays_out_2x2_and_resizes_cells():
    views = {name: np.zeros((360, 480, 3), dtype=np.uint8) for name in ("Front", "Right", "Rear", "Left")}
    assert compose_grid(views).shape == (720, 960, 3)
    assert compose_grid(views, cell_size=(224, 224)).shape == (448, 448, 3)


def test_compose_grid_single_view_unchanged():
    image = np.zeros((10, 10, 3), dtype=np.uint8)
    assert compose_grid({SINGLE_VIEW_NAME: image}) is image


def test_view_point_direction_matches_the_view_centres():
    assert view_point_to_direction("Front", 240, 180) == (0.0, 0.0)
    assert view_point_to_direction("Right", 240, 180) == (90.0, 0.0)
    assert view_point_to_direction("Left", 240, 180) == (-90.0, 0.0)
    assert abs(view_point_to_direction("Rear", 240, 180)[0]) == 180.0
    yaw, pitch = view_point_to_direction("Front", 240, 0)
    assert yaw == 0.0 and pitch > 0  # top of the view looks up
    assert view_point_to_direction(SINGLE_VIEW_NAME, 240, 180) is None


def test_view_point_direction_agrees_with_the_remap_tables():
    # The viewer marks a box where the dewarp actually sampled it from.
    map_x, map_y = create_perspective_map(960, 480, yaw=90.0)
    for x, y in [(30, 40), (400, 300), (240, 10)]:
        yaw, pitch = view_point_to_direction("Right", x, y)
        assert abs((yaw / 360 + 0.5) * 960 - map_x[y, x]) < 0.5
        assert abs((0.5 - pitch / 180) * 480 - map_y[y, x]) < 0.5
