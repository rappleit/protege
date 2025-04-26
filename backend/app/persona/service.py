# Placeholder for Persona configuration and logic
# Defines different persona types, their configurations (capabilities, goals, etc.)

class PersonaConfig:
    def __init__(self, role: str, capabilities: list, goals: list, workflow: list, behaviour: dict):
        self.role = role
        self.capabilities = capabilities
        self.goals = goals
        self.workflow = workflow # e.g., steps in the conversation flow
        self.behaviour = behaviour # e.g., emotional responses, tone

class PersonaService:
    def __init__(self):
        # Load persona configurations (e.g., from files or a database)
        self.personas = {
            "tutor": PersonaConfig(
                role="knowledgeable and patient tutor",
                capabilities=["explain_concepts", "ask_questions", "provide_feedback"],
                goals=["ensure student understanding", "maintain engagement"],
                workflow=["introduction", "concept_explanation", "q&a", "summary"],
                behaviour={"tone": "encouraging", "patience_level": "high"}
            ),
            "interviewer": PersonaConfig(
                role="professional interviewer",
                capabilities=["ask_behavioral_questions", "ask_technical_questions", "evaluate_responses"],
                goals=["assess candidate suitability", "maintain professional demeanor"],
                workflow=["introduction", "behavioral_questions", "technical_questions", "wrap_up"],
                behaviour={"tone": "neutral", "formality": "high"}
            )
            # Add more persona types here
        }
        print("PersonaService initialized")

    def get_config(self, persona_type: str) -> PersonaConfig:
        config = self.personas.get(persona_type)
        if not config:
            print(f"Warning: Persona type '{persona_type}' not found. Using default or raising error.")
            # Handle case where persona type doesn't exist (e.g., return default or raise error)
            # For now, let's raise an error
            raise ValueError(f"Persona type '{persona_type}' not recognized.")
        print(f"Retrieved config for persona: {persona_type}")
        return config

# Instantiate the service (could use FastAPI dependency injection later)
persona_service = PersonaService() 