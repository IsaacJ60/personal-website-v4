"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { photoDetailsLimits } from "../lib/admin-photos";
import styles from "../admin.module.css";
import portfolioStyles from "../portfolio.module.css";

function normalize(value: string) {
  return value.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export default function PhotoLocationField({ value, locations, disabled, onChange }: {
  value: string;
  locations: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const listId = `${inputId}-suggestions`;
  const control = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);
  const setControl = useCallback((node: HTMLDivElement | null) => {
    control.current = node;
    if (node) setPortalContainer(node.closest("[data-dark-palette]"));
  }, []);
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const term = normalize(query);
  const matches = locations.filter((location) => normalize(location).includes(term));
  const open = show && !disabled && matches.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;
  const activeId = open && active >= 0 && active < matches.length ? optionId(active) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function openList() {
    setQuery("");
    setActive(-1);
    setShow(true);
  }

  function closeList() {
    setShow(false);
    setActive(-1);
  }

  function choose(location: string) {
    onChange(location);
    closeList();
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && show) {
      event.preventDefault();
      closeList();
    }
    if (event.key === "Enter" && activeId) {
      event.preventDefault();
      choose(matches[active]);
    }
    if (event.key === "Tab") closeList();
    const count = show ? matches.length : locations.length;
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && count) {
      event.preventDefault();
      const down = event.key === "ArrowDown";
      if (!show) openList();
      setActive(active < 0 ? (down ? 0 : count - 1)
        : Math.max(0, Math.min(count - 1, active + (down ? 1 : -1))));
    }
  }

  return <div className={styles.locationField}>
    <label htmlFor={inputId}><span>Location <small>(optional)</small></span></label>
    <Popover.Root open={open} onOpenChange={(next) => { if (!next) closeList(); }}>
      <Popover.Anchor asChild>
        <div ref={setControl} className={styles.locationControl}>
          <input id={inputId} value={value} maxLength={photoDetailsLimits.location} autoComplete="off" disabled={disabled}
            role="combobox" aria-expanded={open} aria-autocomplete="list"
            aria-controls={open ? listId : undefined} aria-activedescendant={activeId}
            onFocus={openList} onClick={() => { if (!show) openList(); }} onKeyDown={handleKey}
            onChange={(event) => {
              onChange(event.target.value);
              setQuery(event.target.value);
              setActive(-1);
              setShow(true);
            }} />
          {locations.length > 0 && <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />}
        </div>
      </Popover.Anchor>
      {open && <Popover.Portal container={portalContainer}>
        <Popover.Content className={styles.locationSuggestions} role="presentation"
          align="start" sideOffset={6} collisionPadding={12}
          onOpenAutoFocus={(event) => event.preventDefault()} onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => { if (event.target instanceof Node && control.current?.contains(event.target)) event.preventDefault(); }}>
          <div role="listbox" id={listId} aria-label="Previously used locations" className={portfolioStyles.filterOptions}>
            {matches.map((location, index) => <button key={location} id={optionId(index)} type="button" role="option"
              className={portfolioStyles.filterOption} tabIndex={-1} data-active={active === index}
              aria-selected={location === value} onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()} onClick={() => choose(location)}>
              <span>{location}</span>
              {location === value && <Check size={14} strokeWidth={1.5} aria-hidden="true" />}
            </button>)}
          </div>
        </Popover.Content>
      </Popover.Portal>}
    </Popover.Root>
  </div>;
}
