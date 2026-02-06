import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

export const Basic = () => (
  <Card className="max-w-md">
    <CardHeader>
      <CardTitle>Card Title</CardTitle>
      <CardDescription>Short description text to preview the style.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="ct-prose text-sm">
        This is a CardContent area. Use it for controls, generation results, and settings. It uses your ct theme tokens.
      </div>
    </CardContent>
  </Card>
);
