/*
 * Module settings for the Meshtasticd Cockpit page.
 *
 * Edit the defaults below to match your meshtasticd installation,
 * then run `make` and redeploy.
 */

export interface MeshtasticdInstance {
    /** Display label shown in the UI. */
    label: string;
    /** Systemd unit name (without .service). Used for status and logs. */
    unit: string;
    /** Absolute path to the main config.yaml. */
    configPath: string;
    /** Absolute path to the directory containing per-radio YAML config files. */
    radioConfigDir: string;
}

/**
 * One or more meshtasticd instances to manage.
 *
 * Most users only need a single entry. To manage multiple instances on the
 * same host (e.g. systemd template units like meshtasticd@radio1), add more
 * entries below. The first entry is currently used by the UI.
 */
export const INSTANCES: MeshtasticdInstance[] = [
    {
        label: "meshtasticd",
        unit: "meshtasticd",
        configPath: "/etc/meshtasticd/config.yaml",
        radioConfigDir: "/etc/meshtasticd/config.d",
    },
    // Example second instance — uncomment and edit if needed:
    // {
    //     label: "radio1",
    //     unit: "meshtasticd@radio1",
    //     configPath: "/etc/meshtasticd/radio1.yaml",
    //     radioConfigDir: "/etc/meshtasticd/radio1.d",
    // },
];