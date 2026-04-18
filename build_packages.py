#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Dict, Iterable, List

PROJECT_DIR = Path(__file__).resolve().parent
DIST_DIR = PROJECT_DIR / 'dist'
PACKAGE_BASENAME = 'tornevall-networks-social-media-tools'
INCLUDE_PATHS = [
    'manifest.json',
    'html',
    'js',
    'css',
    'icons',
    'README.md',
    'CHANGELOG.md',
    'CHROME_WEB_STORE_COMPLIANCE.md',
]
BROWSER_TARGETS: Dict[str, Dict[str, Any]] = {
    'chrome': {
        'archive_extension': '.zip',
        'manifest_patch': {},
        'create_legacy_alias': True,
    },
    'edge': {
        'archive_extension': '.zip',
        'manifest_patch': {},
    },
    'opera': {
        'archive_extension': '.zip',
        'manifest_patch': {},
    },
    'firefox': {
        'archive_extension': '.zip',
        'manifest_patch': {
            'browser_specific_settings': {
                'gecko': {
                    'id': 'socialgpt@tornevall.net',
                    'strict_min_version': '121.0',
                }
            }
        },
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Build Chrome-first SocialGPT browser packages for Chrome, Edge, Opera, and Firefox.'
    )
    parser.add_argument(
        '--targets',
        default=','.join(BROWSER_TARGETS.keys()),
        help='Comma-separated browser targets to package. Default: chrome,edge,opera,firefox',
    )
    parser.add_argument(
        '--output-dir',
        default=str(DIST_DIR),
        help='Directory where archives will be written. Default: socialgpt-chrome/dist',
    )
    parser.add_argument(
        '--basename',
        default=PACKAGE_BASENAME,
        help='Archive basename. Default: tornevall-networks-social-media-tools',
    )
    return parser.parse_args()


def deep_merge(base: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_manifest() -> Dict[str, Any]:
    manifest_path = PROJECT_DIR / 'manifest.json'
    return json.loads(manifest_path.read_text(encoding='utf-8'))


def copy_project_payload(stage_dir: Path) -> None:
    for relative_path in INCLUDE_PATHS:
        source = PROJECT_DIR / relative_path
        target = stage_dir / relative_path
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)


def write_manifest(stage_dir: Path, manifest: Dict[str, Any]) -> None:
    manifest_path = stage_dir / 'manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def create_zip(archive_path: Path, source_dir: Path) -> None:
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED) as zip_handle:
        for path in sorted(source_dir.rglob('*')):
            if path.is_file():
                zip_handle.write(path, path.relative_to(source_dir).as_posix())


def normalize_targets(raw_targets: str) -> List[str]:
    targets = []
    for target in [part.strip().lower() for part in raw_targets.split(',')]:
        if not target:
            continue
        if target not in BROWSER_TARGETS:
            raise SystemExit(f'Unsupported browser target: {target}')
        if target not in targets:
            targets.append(target)
    if not targets:
        raise SystemExit('No browser targets selected.')
    return targets


def build_target(target: str, output_dir: Path, basename: str, base_manifest: Dict[str, Any]) -> Iterable[Path]:
    target_config = BROWSER_TARGETS[target]
    manifest = deep_merge(base_manifest, target_config.get('manifest_patch', {}))

    with tempfile.TemporaryDirectory(prefix=f'socialgpt-{target}-') as temp_dir:
        stage_dir = Path(temp_dir) / f'{basename}-{target}'
        stage_dir.mkdir(parents=True, exist_ok=True)
        copy_project_payload(stage_dir)
        write_manifest(stage_dir, manifest)

        archive_extension = str(target_config.get('archive_extension', '.zip'))
        target_archive = output_dir / f'{basename}-{target}{archive_extension}'
        create_zip(target_archive, stage_dir)
        yield target_archive

        if target_config.get('create_legacy_alias'):
            legacy_archive = output_dir / f'{basename}{archive_extension}'
            shutil.copy2(target_archive, legacy_archive)
            yield legacy_archive


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    targets = normalize_targets(args.targets)
    manifest = load_manifest()

    created_archives: List[Path] = []
    for target in targets:
        for archive_path in build_target(target, output_dir, args.basename, manifest):
            created_archives.append(archive_path)

    print('Created SocialGPT browser packages:')
    for archive_path in created_archives:
        print(f' - {archive_path}')

    print(f'Chrome source manifest remained unchanged at: {PROJECT_DIR / "manifest.json"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

