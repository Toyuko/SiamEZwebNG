/**
 * SiamEZ UI kit — import from `@/components/ui/<name>` or this barrel.
 * Existing call sites keep deep imports; barrel is for discoverability.
 */

export { Button, buttonVariants, type ButtonProps } from "./button";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./card";
export { Input, type InputProps } from "./input";
export { Label, type LabelProps } from "./label";
export { Select, type SelectProps } from "./select";
export { Textarea, type TextareaProps } from "./textarea";
export { Modal } from "./modal";
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  type DialogProps,
  type DialogContentProps,
} from "./dialog";
export { Sheet, sheetVariants, type SheetProps } from "./sheet";
export { Skeleton, type SkeletonProps } from "./skeleton";
export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldHint,
  type FieldProps,
  type FieldLabelProps,
  type FieldDescriptionProps,
  type FieldErrorProps,
  type FieldHintProps,
} from "./field";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./table";
export {
  fadeIn,
  fadeInUp,
  scaleIn,
  staggerChildren,
  motionTransition,
} from "./motion";
