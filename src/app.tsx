/*
 * SPDX-License-Identifier: LGPL-2.1-or-later
 *
 * Copyright (C) 2017 Red Hat, Inc.
 * 
 *  
 *  Meshtasticd Config Module for Cockpit
 * 
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { DescriptionList, DescriptionListDescription, DescriptionListGroup, DescriptionListTerm } from "@patternfly/react-core/dist/esm/components/DescriptionList/index.js";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect/index.js";
import { Label } from "@patternfly/react-core/dist/esm/components/Label/index.js";
import { Page, PageSection } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { Tab, Tabs, TabTitleText } from "@patternfly/react-core/dist/esm/components/Tabs/index.js";
import { TextArea } from "@patternfly/react-core/dist/esm/components/TextArea/index.js";

import cockpit from 'cockpit';
import { INSTANCES } from './settings';

const _ = cockpit.gettext;

// Currently uses the first configured instance. A future enhancement
// can add an instance selector when INSTANCES.length > 1.
const instance = INSTANCES[0];
const UNIT = instance.unit;
const CONFIG_PATH = instance.configPath;
const RADIO_CONFIG_DIR = instance.radioConfigDir;

/* ------------------------------ Service status ------------------------------ */

interface ServiceStatus {
    loadState: string;
    activeState: string;
    subState: string;
    unitFileState: string;
}

const parseShow = (output: string): ServiceStatus => {
    const status: ServiceStatus = { loadState: "", activeState: "", subState: "", unitFileState: "" };
    for (const line of output.split("\n")) {
        const idx = line.indexOf("=");
        if (idx < 0) continue;
        const key = line.slice(0, idx);
        const value = line.slice(idx + 1).trim();
        if (key === "LoadState") status.loadState = value;
        else if (key === "ActiveState") status.activeState = value;
        else if (key === "SubState") status.subState = value;
        else if (key === "UnitFileState") status.unitFileState = value;
    }
    return status;
};

const activeColor = (s: string): "green" | "red" | "orange" | "grey" => {
    if (s === "active") return "green";
    if (s === "failed") return "red";
    if (s === "activating" || s === "deactivating" || s === "reloading") return "orange";
    return "grey";
};

/* ----------------------------- File editor panel ---------------------------- */

interface FileEditorPanelProps {
    path: string;
    title: string;
}

const FileEditorPanel: React.FC<FileEditorPanelProps> = ({ path, title }) => {
    const [content, setContent] = useState("");
    const [original, setOriginal] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ variant: "success" | "danger" | "warning"; text: string } | null>(null);

const load = useCallback(() => {
        setLoading(true);
        setError(null);
        setMessage(null);
        cockpit.file(path, { superuser: "try" }).read()
            .then((data: string | null) => {
                const text = data ?? "";
                setContent(text);
                setOriginal(text);
                if (data === null) {
                    setMessage({
                        variant: "warning",
                        text: _("File does not exist yet. Saving will create it.")
                    });
                }
            })
            .catch((err: { message?: string }) => {
                const msg = err.message || "";
                const isPermission = /not permitted|permission denied|not authorized|access denied/i.test(msg);
                setError(isPermission
                    ? _('Permission denied. Click "Limited access" at the top of the Cockpit page and switch to administrative access, then reload this tab.')
                    : (msg || _("Failed to read file")));
            })
            .finally(() => setLoading(false));
    }, [path]);

    useEffect(() => { load() }, [load]);

const save = async () => {
        setSaving(true);
        setMessage(null);
        const backupPath = `${path}.cockpit_backup`;
        try {
            // Backup current file if it exists; ignore errors if it doesn't.
            try {
                await cockpit.spawn(
                    ["cp", "-p", path, backupPath],
                    { superuser: "try", err: "message" }
                );
            } catch {
                /* Source missing or first save — proceed without backup. */
            }

            await cockpit.file(path, { superuser: "try" }).replace(content);
            setOriginal(content);
            setMessage({
                variant: "success",
                text: cockpit.format(_("Saved. Backup written to $0"), backupPath),
            });
        } catch (err) {
            const msg = (err as { message?: string }).message || "";
            const isPermission = /not permitted|permission denied|not authorized|access denied/i.test(msg);
            setMessage({
                variant: "danger",
                text: isPermission
                    ? _('Permission denied. Click "Limited access" at the top of the Cockpit page and switch to administrative access, then try again.')
                    : (msg || _("Failed to save")),
            });
        } finally {
            setSaving(false);
        }
    };

    const dirty = content !== original;

    return (
        <Card>
            <CardTitle>{title}</CardTitle>
            <CardBody>
                <p style={{
                    marginBottom: "1rem",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    color: "var(--pf-t--global--text--color--subtle, #6a6e73)",
                }}>
                    {path}
                </p>

                {loading && <Spinner size="md" />}

                {error && (
                    <Alert variant="danger" title={_("Could not load file")} isInline>
                        {error}
                    </Alert>
                )}

                {!loading && !error && (
                    <>
                        {message && (
                            <Alert
                                variant={message.variant}
                                title={message.text}
                                isInline
                                style={{ marginBottom: "1rem" }}
                            />
                        )}

                        <TextArea
                            value={content}
                            onChange={(_e, v) => setContent(v)}
                            aria-label={title}
                            resizeOrientation="vertical"
                            style={{
                                fontFamily: "monospace",
                                minHeight: "400px",
                                width: "100%",
                                fontSize: "0.85rem",
                                whiteSpace: "pre",
                            }}
                        />

                        <div style={{
                            marginTop: "1rem",
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                        }}>
                            <Button
                                variant="primary"
                                onClick={save}
                                isDisabled={saving || !dirty}
                                isLoading={saving}
                            >
                                {_("Save")}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={load}
                                isDisabled={saving || loading}
                            >
                                {_("Reload from disk")}
                            </Button>
                            {dirty && (
                                <span style={{
                                    color: "var(--pf-t--global--text--color--subtle, #6a6e73)",
                                    fontSize: "0.85rem",
                                }}>
                                    {_("Unsaved changes")}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </CardBody>
        </Card>
    );
};

/* --------------------------- Radio config (multi) --------------------------- */

const RadioConfigPanel: React.FC = () => {
    const [files, setFiles] = useState<string[] | null>(null);
    const [selected, setSelected] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const listFiles = useCallback(() => {
        setLoading(true);
        setError(null);
        // Shell glob so missing matches don't error. 2>/dev/null hides "No such file".
        cockpit.spawn(
            ["sh", "-c",
                `ls -1 ${RADIO_CONFIG_DIR}/*.yaml ${RADIO_CONFIG_DIR}/*.yml 2>/dev/null || true`],
            { superuser: "try", err: "message" }
        )
            .then((out: string) => {
                const list = out.split("\n").map(s => s.trim()).filter(Boolean);
                setFiles(list);
                setSelected(prev => (prev && list.includes(prev)) ? prev : (list[0] || ""));
            })
            .catch((err: { message?: string }) =>
                setError(err.message || _("Failed to list config files")))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { listFiles() }, [listFiles]);

    if (loading)
        return <Spinner size="md" />;

    if (error)
        return <Alert variant="danger" title={_("Could not list files")}>{error}</Alert>;

    if (!files || files.length === 0)
        return (
            <Alert variant="info" title={_("No radio config files found")}>
                {cockpit.format(_("No .yaml or .yml files in $0"), RADIO_CONFIG_DIR)}
            </Alert>
        );

    const shortName = (p: string) => p.replace(`${RADIO_CONFIG_DIR}/`, "");

    return (
        <>
            <Card style={{ marginBottom: "1rem" }}>
                <CardBody>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <label htmlFor="radio-file-select" style={{ fontWeight: 600 }}>
                            {_("File:")}
                        </label>
                        <FormSelect
                            id="radio-file-select"
                            value={selected}
                            onChange={(_e, v) => setSelected(v)}
                            aria-label={_("Select radio config file")}
                            style={{ maxWidth: "400px" }}
                        >
                            {files.map(f => (
                                <FormSelectOption key={f} value={f} label={shortName(f)} />
                            ))}
                        </FormSelect>
                        <Button variant="secondary" onClick={listFiles}>
                            {_("Rescan")}
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {selected && (
                <FileEditorPanel
                    key={selected}
                    path={selected}
                    title={shortName(selected)}
                />
            )}
        </>
    );
};

/* -------------------------------- Application ------------------------------- */

export const Application = () => {
    const [activeTabKey, setActiveTabKey] = useState<string | number>(0);

    const [status, setStatus] = useState<ServiceStatus | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);

    const [logs, setLogs] = useState<string>("");
    const [logsError, setLogsError] = useState<string | null>(null);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsLoaded, setLogsLoaded] = useState(false);

    const refreshStatus = useCallback(() => {
        setStatusLoading(true);
        setStatusError(null);
        cockpit.spawn(
            ["systemctl", "show", UNIT,
                "--property=LoadState,ActiveState,SubState,UnitFileState"],
            { err: "message" }
        )
            .then((out: string) => setStatus(parseShow(out)))
            .catch((err: { message?: string }) =>
                setStatusError(err.message || _("Failed to query service")))
            .finally(() => setStatusLoading(false));
    }, []);

    const refreshLogs = useCallback(() => {
        setLogsLoading(true);
        setLogsError(null);
        cockpit.spawn(
            ["journalctl", "-u", UNIT, "-n", "200", "--no-pager", "--output=short-iso"],
            { err: "message", superuser: "try" }
        )
            .then((out: string) => setLogs(out.trim() || _("No log entries found.")))
            .catch((err: { message?: string }) =>
                setLogsError(err.message || _("Failed to read logs")))
            .finally(() => {
                setLogsLoading(false);
                setLogsLoaded(true);
            });
    }, []);

    useEffect(() => { refreshStatus() }, [refreshStatus]);

    useEffect(() => {
        if (activeTabKey === 1 && !logsLoaded && !logsLoading) refreshLogs();
    }, [activeTabKey, logsLoaded, logsLoading, refreshLogs]);

    const handleTabClick = (_event: React.MouseEvent, tabIndex: string | number) =>
        setActiveTabKey(tabIndex);

    const installed = !!status && status.loadState !== "" && status.loadState !== "not-found";

    return (
        <Page>
            <PageSection type="tabs">
                <Tabs
                    activeKey={activeTabKey}
                    onSelect={handleTabClick}
                    aria-label={_("Starter Kit sections")}
                    role="region"
                >
                    <Tab eventKey={0} title={<TabTitleText>{_("Overview")}</TabTitleText>} />
                    <Tab eventKey={1} title={<TabTitleText>{_("Logs")}</TabTitleText>} />
                    <Tab eventKey={2} title={<TabTitleText>{_("Config")}</TabTitleText>} />
                    <Tab eventKey={3} title={<TabTitleText>{_("Radio Config")}</TabTitleText>} />
                </Tabs>
            </PageSection>

            <PageSection>
                {activeTabKey === 0 && (
                    <Card>
                        <CardTitle>{cockpit.format(_("$0 service"), UNIT)}</CardTitle>
                        <CardBody>
                            {statusLoading && <Spinner size="md" />}

                            {statusError && (
                                <Alert variant="danger" title={_("Could not query service status")}>
                                    {statusError}
                                </Alert>
                            )}

                            {!statusLoading && !statusError && status && !installed && (
                                <Alert
                                    variant="warning"
                                    title={cockpit.format(_("$0 is not installed"), UNIT)}
                                >
                                    {_("No unit file was found on this system.")}
                                </Alert>
                            )}

                            {!statusLoading && !statusError && status && installed && (
                                <DescriptionList isHorizontal>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>{_("Installed")}</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            <Label color="green">{_("Yes")}</Label>
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>{_("Running")}</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            <Label color={status.activeState === "active" ? "green" : "grey"}>
                                                {status.activeState === "active" ? _("Yes") : _("No")}
                                            </Label>
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>{_("Active state")}</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            <Label color={activeColor(status.activeState)}>
                                                {status.activeState || _("unknown")}
                                            </Label>
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>{_("Sub state")}</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {status.subState || _("unknown")}
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>{_("Unit file state")}</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {status.unitFileState || _("unknown")}
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>{_("Load state")}</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {status.loadState}
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                </DescriptionList>
                            )}

                            <div style={{ marginTop: "1rem" }}>
                                <Button variant="secondary" onClick={refreshStatus} isDisabled={statusLoading}>
                                    {_("Refresh")}
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                )}

                {activeTabKey === 1 && (
                    <Card>
                        <CardTitle>{cockpit.format(_("$0 logs"), UNIT)}</CardTitle>
                        <CardBody>
                            <div style={{ marginBottom: "1rem" }}>
                                <Button variant="secondary" onClick={refreshLogs} isDisabled={logsLoading}>
                                    {_("Refresh logs")}
                                </Button>
                            </div>

                            {logsLoading && <Spinner size="md" />}

                            {logsError && (
                                <Alert variant="danger" title={_("Could not read logs")}>
                                    {logsError}
                                </Alert>
                            )}

                            {!logsLoading && !logsError && logsLoaded && (
                                <pre
                                    style={{
                                        maxHeight: "60vh",
                                        overflow: "auto",
                                        padding: "1rem",
                                        backgroundColor: "var(--pf-t--global--background--color--secondary--default, #f5f5f5)",
                                        border: "1px solid var(--pf-t--global--border--color--default, #d2d2d2)",
                                        borderRadius: "4px",
                                        fontSize: "0.85rem",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {logs}
                                </pre>
                            )}
                        </CardBody>
                    </Card>
                )}

                {activeTabKey === 2 && (
                    <FileEditorPanel
                        path={CONFIG_PATH}
                        title={_("Main config")}
                    />
                )}

                {activeTabKey === 3 && (
                    <RadioConfigPanel />
                )}
            </PageSection>
        </Page>
    );
};