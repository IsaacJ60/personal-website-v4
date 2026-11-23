"use client";

import * as Popover from "@radix-ui/react-popover";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import styles from "../portfolio.module.css";

type Props = {
  label: string;
  allLabel: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  searchable?: boolean;
};

const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export default function ArchiveFilter(props: Props) {
  const [open, setOpen] = useState(false);
  return <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Trigger className={styles.filterTrigger} type="button"
      aria-label={`Filter by ${props.label}: ${props.value || props.allLabel}`}
      data-filtered={Boolean(props.value)} title={props.value || props.allLabel}>
      <span>{props.value || props.allLabel}</span><ChevronDown size={13} strokeWidth={1.4} aria-hidden="true" />
    </Popover.Trigger>
    {open && <FilterOptions {...props} onSelect={(value) => { props.onChange(value); setOpen(false); }} />}
  </Popover.Root>;
}

function FilterOptions({ label, allLabel, options, value, searchable = false, onSelect }: Props & {
  onSelect: (value: string) => void;
}) {
  const listId = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const optionList = useRef<HTMLDivElement>(null);
  const items = ["", ...new Set(value ? [...options, value] : options)];
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(Math.max(0, items.indexOf(value)));
  const matches = items.filter((item) => normalize(item || allLabel).includes(normalize(query.trim())));
  const activeIndex = Math.min(active, matches.length - 1);
  const optionId = (item: string) => `${listId}-${items.indexOf(item)}`;
  const activeId = activeIndex >= 0 ? optionId(matches[activeIndex]) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function handleKey(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(Math.max(0, Math.min(matches.length - 1, activeIndex + (event.key === "ArrowDown" ? 1 : -1))));
    } else if ((event.key === "Enter" || (!searchable && event.key === " ")) && activeIndex >= 0) {
      event.preventDefault();
      onSelect(matches[activeIndex]);
    } else if (!searchable && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : matches.length - 1);
    }
  }

  return <Popover.Content className={styles.filterPopover} data-searchable={searchable}
    align="end" sideOffset={10} collisionPadding={16} aria-label={`Choose ${label}`}
    onOpenAutoFocus={(event) => { event.preventDefault(); (searchable ? searchInput.current : optionList.current)?.focus(); }}>
    {searchable && <div className={styles.filterSearch}>
      <Search size={15} strokeWidth={1.4} aria-hidden="true" />
      <input ref={searchInput} role="combobox" aria-label={`Search ${label}s`} autoComplete="off"
        aria-expanded="true" aria-autocomplete="list" aria-controls={listId} aria-activedescendant={activeId}
        placeholder={`Find a ${label}…`} value={query} onKeyDown={handleKey}
        onChange={(event) => { setQuery(event.target.value); setActive(0); }} />
    </div>}
    <div id={listId} role="listbox" aria-label={`${label} options`} className={styles.filterOptions}
      tabIndex={searchable ? undefined : 0} ref={optionList}
      aria-activedescendant={searchable ? undefined : activeId} onKeyDown={searchable ? undefined : handleKey}>
      {matches.map((item, index) => <button key={item} id={optionId(item)} type="button" role="option"
        tabIndex={-1} aria-selected={item === value} data-active={index === activeIndex}
        className={styles.filterOption} onMouseMove={() => setActive(index)}
        onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(item)}>
        <span>{item || allLabel}</span>
        {item === value && <Check size={14} strokeWidth={1.5} aria-hidden="true" />}
      </button>)}
    </div>
    {matches.length === 0 && <p className={styles.filterEmpty} role="status">No matching {label}s.</p>}
  </Popover.Content>;
}
