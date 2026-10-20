"use client";

import { useRouter } from "next/navigation";
import { Button as AriaButton } from "react-aria-components";
import { Key01, LogOut01 } from "@untitledui/icons";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Avatar } from "@/components/base/avatar/avatar";
import { useGetMeQuery } from "@/features/session";
import { useSignoutMutation } from "@/features/auth";
import { apiSlice } from "@/lib/redux/api/apiSlice";
import { useAppDispatch } from "@/lib/redux/hooks";

/** Up to two initials from a key's name ("ops key" -> "OK"). */
function initials(name?: string) {
  return (
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** The signed-in API key - there are no user accounts - with a link to the keys page and sign-out. */
export function UserMenu() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: me } = useGetMeQuery();
  const [signout] = useSignoutMutation();

  const handleSignOut = async () => {
    await signout();
    // Clears every cached query (campaigns, keys, ...) so the next sign-in
    // doesn't briefly show data fetched with the previous key.
    dispatch(apiSlice.util.resetApiState());
    router.push("/login");
  };

  return (
    <Dropdown.Root>
      <AriaButton className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg p-1 outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2">
        <Avatar size="sm" initials={initials(me?.name)} />
        <span className="flex min-w-0 flex-col text-left">
          <span className="truncate text-sm font-semibold text-secondary">{me?.name}</span>
          <span className="truncate text-xs text-tertiary capitalize">{me?.preset ?? "custom claims"}</span>
        </span>
      </AriaButton>

      <Dropdown.Popover placement="bottom right" className="w-56">
        <Dropdown.Menu
          onAction={(key) => {
            if (key === "sign-out") handleSignOut();
            if (key === "keys") router.push("/settings/keys");
          }}
        >
          <Dropdown.Item id="keys" label="API keys" icon={Key01} />
          <Dropdown.Separator />
          <Dropdown.Item id="sign-out" label="Sign out" icon={LogOut01} />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}
