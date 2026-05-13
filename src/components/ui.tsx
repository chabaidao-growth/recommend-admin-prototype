import clsx from 'clsx'
import { Fragment, type PropsWithChildren, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../lib/types'
import styles from '../styles/ui.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'dashed' | 'ghost' | 'danger'
type ButtonSize = 'default' | 'small' | 'mini'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  children,
  className,
  variant = 'secondary',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        styles.button,
        styles[`button${capitalize(variant)}`],
        styles[`button${capitalize(size)}`],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Panel({
  title,
  extra,
  children,
  className,
}: PropsWithChildren<{ title?: ReactNode; extra?: ReactNode; className?: string }>) {
  return (
    <section className={clsx(styles.panel, className)}>
      {(title || extra) && (
        <header className={styles.panelHeader}>
          <div className={styles.panelTitle}>{title}</div>
          <div>{extra}</div>
        </header>
      )}
      {children}
    </section>
  )
}

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string
  value: ReactNode
  helper?: ReactNode
}) {
  return (
    <div className={styles.metricCard}>
      <span className={styles.labelCaps}>{label}</span>
      <strong className={styles.metricValue}>{value}</strong>
      {helper ? <span className={styles.metricHelper}>{helper}</span> : null}
    </div>
  )
}

export function Tag({
  children,
  tone,
}: PropsWithChildren<{ tone: 'hot' | 'new' | 'manual' | 'success' | 'draft' | 'warning' | 'muted' }>) {
  return (
    <span className={clsx(styles.tag, styles[`tag${capitalize(tone)}`])}>{children}</span>
  )
}

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean },
) {
  return (
    <input
      className={clsx(styles.input, props.error && styles.inputError)}
      {...props}
    />
  )
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean },
) {
  return (
    <textarea
      className={clsx(styles.textarea, props.error && styles.inputError)}
      {...props}
    />
  )
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean },
) {
  return (
    <select
      className={clsx(styles.select, props.error && styles.inputError)}
      {...props}
    />
  )
}

export function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange?: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={clsx(styles.toggle, checked && styles.toggleOn, disabled && styles.toggleDisabled)}
      onClick={() => onChange?.(!checked)}
    >
      <span className={styles.toggleThumb} />
    </button>
  )
}

export function Tabs({
  value,
  items,
  onChange,
}: {
  value: string
  items: Array<{ label: string; value: string }>
  onChange: (value: string) => void
}) {
  return (
    <div className={styles.tabs}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={clsx(styles.tab, value === item.value && styles.tabActive)}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: PropsWithChildren<{
  open: boolean
  title: ReactNode
  footer?: ReactNode
  onClose: () => void
}>) {
  if (!open) return null

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button type="button" className={styles.iconButton} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer ? <div className={styles.modalFooter}>{footer}</div> : null}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyGraphic}>
        <span />
        <span />
        <span />
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function ProductTile({
  product,
  subtitle,
  suffix,
  compact = false,
}: {
  product: Product
  subtitle?: ReactNode
  suffix?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={clsx(styles.productTile, compact && styles.productTileCompact)}>
      <div className={styles.productThumb} style={{ background: product.accent }}>
        <span>{product.name.slice(0, 2)}</span>
      </div>
      <div className={styles.productMeta}>
        <strong>{product.name}</strong>
        <span>{subtitle ?? `${product.category} · ￥${product.price}`}</span>
      </div>
      {suffix ? <div>{suffix}</div> : null}
    </div>
  )
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 ? <span>/</span> : null}
          {item.href ? <Link to={item.href}>{item.label}</Link> : <strong>{item.label}</strong>}
        </Fragment>
      ))}
    </nav>
  )
}

export function Field({
  label,
  hint,
  children,
}: PropsWithChildren<{ label: string; hint?: ReactNode }>) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint ? <small className={styles.fieldHint}>{hint}</small> : null}
    </label>
  )
}

export function CheckboxPill({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      className={clsx(styles.checkboxPill, checked && styles.checkboxPillChecked)}
      onClick={() => onChange(!checked)}
    >
      <span>{checked ? '✓' : '+'}</span>
      {label}
    </button>
  )
}

export function SectionTitle({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className={styles.sectionTitle}>
      <h2>{title}</h2>
      {action}
    </div>
  )
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}
