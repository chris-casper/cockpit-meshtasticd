# Meshtasticd Cockpit Module

A Cockpit page for managing a meshtasticd installation: service status, logs,
and YAML config editing.

## Install (pre-built tarball)

    sudo mkdir -p /usr/local/share/cockpit/meshtasticd
    sudo tar -xzf meshtasticd-cockpit-*.tar.gz -C /usr/local/share/cockpit/meshtasticd

Reload Cockpit. The **Meshtasticd** entry will appear in the menu.

## Install (from source)

Requires Node.js and npm.

    git clone <repo-url> meshtasticd-cockpit
    cd meshtasticd-cockpit
    make
    sudo mkdir -p /usr/local/share/cockpit
    sudo ln -s "$(pwd)/dist" /usr/local/share/cockpit/meshtasticd

## Configuring the meshtasticd instance

Defaults (systemd unit `meshtasticd`, config at `/etc/meshtasticd/config.yaml`)
work for stock installs. To point at a different instance — or to add more —
edit `src/settings.ts` and rebuild:

    make

Each entry in `INSTANCES` specifies a unit name, main config path, and
per-radio config directory.

## Permissions

Editing YAML files requires root. In Cockpit, click **Limited access** at the
top of the page and switch to **Administrative access** before saving.

## Tabs

- **Overview** — service installed / running status
- **Logs** — recent `journalctl -u <unit>` output
- **Config** — edit `config.yaml` (writes `.cockpit_backup` on save)
- **Radio Config** — edit any YAML in the radio config directory

## License

LGPL-2.1-or-later