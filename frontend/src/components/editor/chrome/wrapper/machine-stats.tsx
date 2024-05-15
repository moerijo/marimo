/* Copyright 2024 Marimo. All rights reserved. */
import { Spinner } from "@/components/icons/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import { connectionAtom } from "@/core/network/connection";
import { getUsageStats } from "@/core/network/requests";
import { UsageResponse } from "@/core/network/types";
import { isPyodide } from "@/core/pyodide/utils";
import { WebSocketState } from "@/core/websocket/types";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useInterval } from "@/hooks/useInterval";
import { useAtomValue } from "jotai";
import { startCase } from "lodash-es";
import {
  CheckCircle2Icon,
  CpuIcon,
  MemoryStickIcon,
  PowerOffIcon,
} from "lucide-react";
import React, { useState } from "react";

export const MachineStats: React.FC = (props) => {
  const [nonce, setNonce] = useState(0);
  const connection = useAtomValue(connectionAtom);
  useInterval(
    () => setNonce((nonce) => nonce + 1),
    // Refresh every 10 seconds, or when the document becomes visible
    { delayMs: 10_000, whenVisible: true },
  );

  const { data } = useAsyncData(async () => {
    if (isPyodide()) {
      return null;
    }
    if (connection.state !== WebSocketState.OPEN) {
      return null;
    }
    return getUsageStats();
  }, [nonce, connection.state]);

  return (
    <div className="flex gap-3">
      {data && <MemoryUsageBar memory={data.memory} />}
      {data && <CPUBar cpu={data.cpu} />}
      <BackendConnection connection={connection.state} />
    </div>
  );
};

const BackendConnection: React.FC<{ connection: WebSocketState }> = ({
  connection,
}) => {
  return (
    <Tooltip delayDuration={200} content={startCase(connection.toLowerCase())}>
      <div>
        {connection === WebSocketState.OPEN && (
          <CheckCircle2Icon className="w-4 h-4" />
        )}
        {connection === WebSocketState.CLOSED && (
          <PowerOffIcon className="w-4 h-4" />
        )}
        {connection === WebSocketState.CONNECTING && <Spinner size="small" />}
        {connection === WebSocketState.CLOSING && (
          <Spinner className="text-destructive" size="small" />
        )}
      </div>
    </Tooltip>
  );
};

const MemoryUsageBar: React.FC<{ memory: UsageResponse["memory"] }> = ({
  memory,
}) => {
  const { percent, total, used } = memory;
  const roundedPercent = Math.round(percent);
  return (
    <Tooltip
      delayDuration={200}
      content={
        <span>
          <b>Memory:</b> {asGB(used)} / {asGB(total)} GB ({roundedPercent}%)
        </span>
      }
    >
      <div className="flex items-center gap-1">
        <MemoryStickIcon className="w-4 h-4" />
        <Bar percent={roundedPercent} />
      </div>
    </Tooltip>
  );
};

const CPUBar: React.FC<{ cpu: UsageResponse["cpu"] }> = ({ cpu }) => {
  const { percent } = cpu;
  const roundedPercent = Math.round(percent);
  return (
    <Tooltip
      delayDuration={200}
      content={
        <span>
          <b>CPU:</b> {roundedPercent}%
        </span>
      }
    >
      <div className="flex items-center gap-1">
        <CpuIcon className="w-4 h-4" />
        <Bar percent={roundedPercent} />
      </div>
    </Tooltip>
  );
};

const Bar: React.FC<{ percent: number }> = ({ percent }) => {
  return (
    <div className="h-3 w-20 bg-[var(--slate-4)] rounded-lg overflow-hidden border">
      <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
    </div>
  );
};

function asGB(bytes: number) {
  // At most 2 decimal places
  const format = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  });
  return format.format(bytes / (1024 * 1024 * 1024));
}
