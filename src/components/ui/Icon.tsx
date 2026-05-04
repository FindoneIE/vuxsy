"use client";

import * as React from "react";
import type { IconProps } from "@phosphor-icons/react";
import {
  Archive as ArchiveIcon,
  ArrowUpRight as ArrowUpRightIcon,
  Bell as BellIcon,
  Briefcase as BriefcaseIcon,
  Buildings as BuildingsIcon,
  Camera as CameraIcon,
  Car as CarIcon,
  CaretDown as CaretDownIcon,
  CaretRight as CaretRightIcon,
  CaretUp as CaretUpIcon,
  ChatCircle as ChatCircleIcon,
  Check as CheckBase,
  CheckCircle as CheckCircleIcon,
  ClipboardText as ClipboardTextIcon,
  CreditCard as CreditCardIcon,
  DotsThreeVertical as DotsThreeVerticalIcon,
  Eye as EyeIcon,
  SealQuestion as FileQuestionIcon,
  Gear as GearIcon,
  GraduationCap as GraduationCapIcon,
  Hammer as HammerIcon,
  Handshake as HandshakeIcon,
  Heart as HeartIcon,
  House as HouseIcon,
  ImageSquare as ImageSquareIcon,
  Laptop as LaptopIcon,
  List as ListLinesIcon,
  ListBullets as ListBulletsIcon,
  MagnifyingGlass as MagnifyingGlassIcon,
  Megaphone as MegaphoneIcon,
  Palette as PaletteIcon,
  Pause as PauseIcon,
  PawPrint as PawPrintIcon,
  Pencil as PencilIcon,
  Play as PlayIcon,
  ShareNetwork as ShareNetworkIcon,
  Flag as FlagIcon,
  SignOut as SignOutIcon,
  SlidersHorizontal as SlidersHorizontalIcon,
  Sparkle as SparkleIcon,
  SquaresFour as SquaresFourIcon,
  Stack as StackIcon,
  Storefront as StorefrontIcon,
  Trash as TrashIcon,
  Truck as TruckIcon,
  User as UserIcon,
  UserCircle as UserCircleIcon,
  Users as UsersIcon,
  Wrench as WrenchIcon,
  X as XIconBase,
  Envelope as EnvelopeIcon,
} from "@phosphor-icons/react";

type AppIconProps = IconProps;

type IconComponent = React.ComponentType<IconProps>;

type IconWrapper = React.ForwardRefExoticComponent<
  AppIconProps & React.RefAttributes<SVGSVGElement>
>;

const createIcon = (Component: IconComponent): IconWrapper => {
  const Wrapped = React.forwardRef<SVGSVGElement, AppIconProps>(
    ({ size, weight = "duotone", className, ...props }, ref) => {
      const resolvedClassName = ["w-5 h-5 sm:w-6 sm:h-6", className]
        .filter(Boolean)
        .join(" ");
      return (
        <Component
          ref={ref}
          weight={weight}
          className={resolvedClassName}
          {...(size ? { size } : {})}
          {...props}
        />
      );
    }
  );

  Wrapped.displayName = `Icon${Component.displayName ?? Component.name ?? ""}`;
  return Wrapped;
};

export const Archive = createIcon(ArchiveIcon);
export const ArrowUpRight = createIcon(ArrowUpRightIcon);
export const Bell = createIcon(BellIcon);
export const Briefcase = createIcon(BriefcaseIcon);
export const Building2 = createIcon(BuildingsIcon);
export const Camera = createIcon(CameraIcon);
export const Car = createIcon(CarIcon);
export const CheckCircle2 = createIcon(CheckCircleIcon);
export const CheckIcon = createIcon(CheckBase);
export const ChevronDown = createIcon(CaretDownIcon);
export const ChevronDownIcon = createIcon(CaretDownIcon);
export const ChevronRightIcon = createIcon(CaretRightIcon);
export const ChevronUpIcon = createIcon(CaretUpIcon);
export const ClipboardList = createIcon(ClipboardTextIcon);
export const CreditCard = createIcon(CreditCardIcon);
export const Eye = createIcon(EyeIcon);
export const FileQuestion = createIcon(FileQuestionIcon);
export const Gear = createIcon(GearIcon);
export const GraduationCap = createIcon(GraduationCapIcon);
export const Hammer = createIcon(HammerIcon);
export const Handshake = createIcon(HandshakeIcon);
export const Heart = createIcon(HeartIcon);
export const Home = createIcon(HouseIcon);
export const ImagePlus = createIcon(ImageSquareIcon);
export const LayoutDashboard = createIcon(SquaresFourIcon);
export const LayoutGrid = createIcon(SquaresFourIcon);
export const Layers = createIcon(StackIcon);
export const Laptop = createIcon(LaptopIcon);
export const List = createIcon(ListBulletsIcon);
export const ListLines = createIcon(ListLinesIcon);
export const LogOut = createIcon(SignOutIcon);
export const Mail = createIcon(EnvelopeIcon);
export const Menu = createIcon(ListBulletsIcon);
export const MessageCircle = createIcon(ChatCircleIcon);
export const MessageCircleQuestion = createIcon(ChatCircleIcon);
export const MessageSquare = createIcon(ChatCircleIcon);
export const Megaphone = createIcon(MegaphoneIcon);
export const MoreVertical = createIcon(DotsThreeVerticalIcon);
export const Palette = createIcon(PaletteIcon);
export const Pause = createIcon(PauseIcon);
export const PawPrint = createIcon(PawPrintIcon);
export const Pencil = createIcon(PencilIcon);
export const Play = createIcon(PlayIcon);
export const Share = createIcon(ShareNetworkIcon);
export const Flag = createIcon(FlagIcon);
export const Search = createIcon(MagnifyingGlassIcon);
export const Settings = createIcon(GearIcon);
export const SlidersHorizontal = createIcon(SlidersHorizontalIcon);
export const Sparkles = createIcon(SparkleIcon);
export const Store = createIcon(StorefrontIcon);
export const Trash2 = createIcon(TrashIcon);
export const Truck = createIcon(TruckIcon);
export const User = createIcon(UserIcon);
export const UserRound = createIcon(UserCircleIcon);
export const Users = createIcon(UsersIcon);
export const Wrench = createIcon(WrenchIcon);
export const XIcon = createIcon(XIconBase);

export { createIcon };
export type { AppIconProps as IconProps };
