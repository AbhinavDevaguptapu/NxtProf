import { motion } from 'framer-motion';

// --- SHADCN/UI & LUCIDE IMPORTS ---
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Link2, ArrowLeft, ArrowRight, CheckCircle2, Circle, ExternalLink } from 'lucide-react';

const ResourceList = ({ resources, clickedResources, setClickedResources, onBack, onContinue, allResourcesClicked, isReadOnly = false }) => {

  const handleClick = (url) => {
    if (isReadOnly) return;
    setClickedResources((prev) => ({ ...prev, [url]: true }));
  };

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Card className="max-w-3xl mx-auto w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Link2 className="h-7 w-7 text-primary" />
              Important Resources
            </CardTitle>
            {!isReadOnly && (
              <CardDescription>
                Please click each link to review the required materials. All links must be opened to continue.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div
              className="space-y-3 max-h-96 overflow-y-auto pr-2"
              style={{ scrollbarGutter: 'stable' }}
            >
              {resources.map((res, index) => {
                const isClicked = !!clickedResources[res.url];
                return (
                  <a
                    key={index}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleClick(res.url)}
                    className={`block p-3 rounded-lg border bg-secondary/30 hover:bg-secondary/70 transition-all duration-200 group ${isClicked && !isReadOnly ? 'border-green-500 shadow-sm' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {!isReadOnly && (
                          isClicked ? (
                            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                          )
                        )}
                        <div className="flex flex-col">
                          {/* UPDATED: Removed line-through class */}
                          <span className={`font-medium ${isClicked && !isReadOnly ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {res.label}
                          </span>
                          {res.note && <span className="text-sm text-muted-foreground">({res.note})</span>}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </a>
                );
              })}
            </div>
          </CardContent>
          {!isReadOnly && (
            <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-between w-full gap-3 pt-6">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Video
              </Button>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <div className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full"
                      disabled={!allResourcesClicked}
                      onClick={onContinue}
                    >
                      Continue to Checklist
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                {!allResourcesClicked && (
                  <TooltipContent>
                    <p>Please view all resources to continue.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </CardFooter>
          )}
        </Card>
      </motion.div>
    </TooltipProvider>
  );
};

export default ResourceList;