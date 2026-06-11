import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import type { OmButtonVariant } from './tokens';

type CommonProps = {
  variant?: OmButtonVariant;
  className?: string;
  fullWidth?: boolean;
};

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type LinkButtonProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: undefined };

type RouterLinkProps = CommonProps & {
  to: string;
  href?: undefined;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

const variantClass: Record<OmButtonVariant, string> = {
  primary: 'om-ds-btn-primary',
  secondary: 'om-ds-btn-secondary',
  tertiary: 'om-ds-btn-tertiary',
};

function classes(variant: OmButtonVariant, fullWidth?: boolean, extra?: string) {
  return ['om-ds-btn', variantClass[variant], fullWidth ? 'w-full' : '', extra]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant = 'primary',
  className,
  fullWidth,
  ...props
}: ButtonProps) {
  return <button type="button" className={classes(variant, fullWidth, className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  className,
  fullWidth,
  href,
  ...props
}: LinkButtonProps) {
  return <a href={href} className={classes(variant, fullWidth, className)} {...props} />;
}

export function ButtonRouterLink({
  variant = 'primary',
  className,
  fullWidth,
  to,
  ...props
}: RouterLinkProps) {
  return <Link to={to} className={classes(variant, fullWidth, className)} {...props} />;
}
