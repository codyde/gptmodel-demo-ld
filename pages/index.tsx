import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useFlags, useLDClient } from "launchdarkly-react-client-sdk";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThreeCircles } from "react-loader-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signIn, signOut } from "next-auth/react";
import { getCookie, setCookie } from "cookies-next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AiPrompt {
  [key: string]: string;
}
export default function Home() {
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email;
  const [setPrompt, setPromptState] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [aiResponse, setAIResponse] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [betaOptIn, setBetaOptIn] = useState<boolean>(false);
  const [userPrompt, setUserPrompt] = useState<string>("");

  const client = useLDClient();

  const { aipromtps, aimodel, ssbeta } = useFlags();

  const setPromptInformation = useCallback(async () => {
    try {
      const prompt = await aipromtps.prompt;
      const model = await aimodel;

      console.log(`The prompt is: ${prompt}`);

      setModel(model);
      setPromptState(prompt);

      return prompt;
    } catch (error) {
      console.error(
        "There was an error setting the prompt information: ",
        error
      );
    }
  }, [aipromtps, aimodel]);

  useEffect(() => {
    setPromptInformation();
  }, [setPromptInformation]);

  const handleChange = useCallback((event: any) => {
    const value = event.target.value;
    setQuery(value);
  }, []);

  async function betaModelOptIn() {
    const context: any = client?.getContext();
    context.user.betaModel = !context.user.betaModel;
    await setBetaOptIn(context.user.betaModel);
    client?.identify(context);
    setCookie("ldcontext", context);
    return context;
  }

  async function submitQuery(userPrompt: string, query: string) {
    try {
      setLoading(true);
      const response = await fetch("/api/gptmodel", {
        method: "POST",
        body: JSON.stringify({ prompt: userPrompt + query }),
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}. Check API Server Logs.`
        );
      }

      const data = await response.json();
      setAIResponse(data);
    } catch (error) {
      console.error("An error occurred:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateContext(contextUpdate: any) {
    const context: any = await client?.getContext();
    Object.assign(context.user, contextUpdate);
    await client?.identify(context);
    const parsedContext = JSON.stringify(context);
    setCookie("ldcontext", parsedContext);
  }

  async function login() {
    updateContext({});
    signIn("github");
  }

  async function logout() {
    updateContext({
      email: "",
      name: "anonymous",
      key: "0",
    });
    signOut();
  }

  useEffect(() => {
    try {
      if (status === "authenticated") {
        const context: any = getCookie("ldcontext");
        console.log(JSON.parse(context));
        const parsedContext = JSON.parse(context);
        parsedContext.user.email = session?.user?.email;
        parsedContext.user.name = session?.user?.name;
        parsedContext.user.key = session?.user?.email?.slice(0, 5);
        client?.identify(parsedContext);
        setCookie("ldcontext", JSON.stringify(parsedContext));
        setBetaOptIn(parsedContext.user.betaModel)
      } else {
        console.log("Not signed in");
        const context: any = getCookie("ldcontext");
      }
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

  return (
    <div className="h-screen mx-2 xl:mx-32 pt-6 xl:pt-32 justify-center items-center">
      <div className="grid w-full place-items-center pt-8">
        <p className="grid text-7xl place-content-center font-bold bg-gradient-to-r from-orange-400 to-red-500 text-transparent bg-clip-text">
          LaunchDarkly AI Models Demo
        </p>
        <p className="grid p-4 w-full place-content-center text-muted-foreground ">
          LaunchDarkly configured to feature flag specific AI prompts, the
          ability to opt in to new models, and the specific models themselves.
        </p>
      </div>
      <div className="absolute top-5 right-5 font-sans">
        {status === "authenticated" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* <Button variant="ghost" className="relative h-8 w-8 rounded-full"> */}
              <Avatar className="h-12 w-12">
                <AvatarImage src={session.user?.image || ""} alt="User" />
                <AvatarFallback>LD</AvatarFallback>
              </Avatar>
              {/* </Button> */}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal font-sans">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session.user?.name || ""}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user?.email || ""}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={betaModelOptIn}>
                  {betaOptIn ? "Disable Beta Model" : "Enable Beta Model"}
                  <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                Log out
                <DropdownMenuShortcut>⌘L</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="grid place-items-center place-content-center">
            <Button
              variant={"outline"}
              onClick={() => login()}
              className="w-full text-xl"
            >
              Login
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 mx-auto overflow-y-auto rounded-[0.5rem] h-full xl:h-2/3 border bg-background shadow ">
        <div className="col-span-5 lg:col-span-1 items-center justify-center">
          <div className="grid w-full m-2 border rounded-xl">
            <p className="text-xl lg:text-2xl font-sans text-muted-foreground mx-auto m-4">
              Current Model
            </p>
            <p className="grid mb-4 font-bold text-2xl text-center lg:text-4xl uppercase bg-gradient-to-r from-orange-400 to-red-500 text-transparent bg-clip-text">
              {model}
            </p>
          </div>
        </div>

        <div className="col-span-5 xl:col-span-4 m-4">
          <Card className=" h-full overflow-y-auto">
            <CardHeader className="text-2xl text-muted-foreground">
              Current Prompt
              <div className="border-b-2 border-b-orange-500 py-4">
                <Select
                  onValueChange={(e) => {
                    setUserPrompt(e);
                  }}
                >
                  <SelectTrigger className="w-full xl:w-1/4">
                    <SelectValue placeholder="Select Prompt" />
                  </SelectTrigger>
                  <SelectContent
                    onSelect={(e) => {
                      console.log(e.currentTarget);
                    }}
                  >
                    {aipromtps.map((prompt: AiPrompt, index: number) =>
                      Object.entries(prompt).map(
                        ([key, value]: [string, string], subIndex: number) => (
                          <SelectItem
                            key={`${index}-${subIndex}`}
                            value={value}
                          >
                            {key}
                          </SelectItem>
                        )
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            {status === "authenticated" && (
              <CardContent className="grid h-64 ">
                <div className="w-full h-full">
                  <Textarea
                    className="w-full"
                    onChange={handleChange}
                    value={query || ""}
                    placeholder="Enter Request"
                  />
                  <Button
                    variant={"outline"}
                    className="flex mx-auto my-4 w-1/5 rounded-md text-lg"
                    onClick={() => submitQuery(userPrompt, query)}
                    type="submit"
                  >
                    {loading ? (
                      <ThreeCircles
                        height="25"
                        width="25"
                        color="white"
                        wrapperStyle={{}}
                        wrapperClass=""
                        visible={true}
                        ariaLabel="three-circles-rotating"
                      />
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </div>
                <div className="h-full">
                  {aiResponse && (
                    <Card className="h-full">
                      <ScrollArea className="h-48 2xl:h-96 w-full overflow-y-auto rounded-md">
                        <pre className="m-6 whitespace-pre-line">
                          {aiResponse}
                        </pre>
                      </ScrollArea>
                    </Card>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
