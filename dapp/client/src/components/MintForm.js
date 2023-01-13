import React from "react";

export function MintForm({ mint, disabled }) {
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);
        const username = formData.get("username").replace('@', '');

        if (username) {
          if (!/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
            alert('Invalid username 🫤');
          }

          const queryString = `?username=${username}`;
          const response = await fetch(`/api/twitter${queryString}`);
          const parsed = await response.json();
          const user = parsed.data;

          if (user) {
            mint(user.id);
          } else {
            alert('Could not find this Twitter account 🫤');
          }
        }
      }}
    >
      <label>Twitter username</label><br />
      <input
        type="text"
        name="username"
        placeholder="elonmusk"
        required
        disabled={disabled}
      /><br />
      <input type="submit" value="Mint" disabled={disabled} />
    </form>
  );
}
